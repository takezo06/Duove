import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { corsHeaders, handleOptions } from "../_shared/cors.ts";
import { createSupabaseClients } from "../_shared/supabase.ts";
import { getUserId } from "../_shared/auth.ts";

// ---------- Pairing helpers ----------
// deno-lint-ignore no-explicit-any
async function isPaired(admin: any, userId: string): Promise<boolean> {
  const { data } = await admin
    .from("relationships")
    .select("id")
    .eq("status", "active")
    .or(`user_id.eq.${userId},partner_id.eq.${userId}`)
    .limit(1);
  return (data?.length ?? 0) > 0;
}

// 32 characters with the look-alikes (0/O, 1/I) left out. 256 is a multiple of 32, so every
// character is equally likely; 8 of them give about a trillion codes.
const INVITE_ALPHABET = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789";
function newInviteCode(): string {
  const bytes = crypto.getRandomValues(new Uint8Array(8));
  return Array.from(bytes, (b) => INVITE_ALPHABET[b % 32]).join("");
}

function serverError(where: string, error: unknown): Response {
  // Database errors name tables and columns: log them here, never send them to the browser
  console.error("relationships failed", where, error);
  return new Response(JSON.stringify({ error: "Something went wrong. Try again." }), {
    status: 500,
    headers: { ...corsHeaders, "Content-Type": "application/json" },
  });
}

function alreadyPaired(message: string): Response {
  return new Response(JSON.stringify({ error: message }), {
    status: 409,
    headers: { ...corsHeaders, "Content-Type": "application/json" },
  });
}

// ---------- Duration helpers ----------
function formatDuration(startDate: Date, endDate: Date): string {
  let diffMs = endDate.getTime() - startDate.getTime();
  if (diffMs < 0) return '0 seconds';
  const totalSeconds = Math.floor(diffMs / 1000);
  const totalMinutes = Math.floor(totalSeconds / 60);
  const totalHours = Math.floor(totalMinutes / 60);
  const totalDays = Math.floor(totalHours / 24);
  const years = Math.floor(totalDays / 365.25);
  let remainingDays = totalDays - Math.floor(years * 365.25);
  const months = Math.floor(remainingDays / 30.44);
  remainingDays = remainingDays - Math.floor(months * 30.44);
  const weeks = Math.floor(remainingDays / 7);
  const days = remainingDays - weeks * 7;
  const remainingHours = totalHours - totalDays * 24;
  const remainingMinutes = totalMinutes - totalHours * 60;
  const remainingSeconds = totalSeconds - totalMinutes * 60;
  const parts: string[] = [];
  if (years > 0) parts.push(`${years} year${years > 1 ? 's' : ''}`);
  if (months > 0) parts.push(`${months} month${months > 1 ? 's' : ''}`);
  if (weeks > 0) parts.push(`${weeks} week${weeks > 1 ? 's' : ''}`);
  if (days > 0) parts.push(`${days} day${days > 1 ? 's' : ''}`);
  if (remainingHours > 0) parts.push(`${remainingHours} hour${remainingHours > 1 ? 's' : ''}`);
  if (remainingMinutes > 0) parts.push(`${remainingMinutes} minute${remainingMinutes > 1 ? 's' : ''}`);
  if (remainingSeconds > 0) parts.push(`${remainingSeconds} second${remainingSeconds > 1 ? 's' : ''}`);
  if (parts.length === 0) return '0 seconds';
  return parts.join(', ');
}

function getConversion(startDate: Date, endDate: Date): string {
  const diffMs = endDate.getTime() - startDate.getTime();
  if (diffMs <= 0) return '';
  const totalSeconds = diffMs / 1000;
  const totalMinutes = totalSeconds / 60;
  const totalHours = totalMinutes / 60;
  const totalDays = totalHours / 24;
  if (totalDays >= 1) {
    return `= ${totalDays.toFixed(2)} days (${Math.floor(totalDays)}d, ${Math.floor((totalDays % 1) * 24)}h)`;
  } else if (totalHours >= 1) {
    return `= ${totalHours.toFixed(2)} hours (${Math.floor(totalHours)}h, ${Math.floor((totalHours % 1) * 60)}m)`;
  } else if (totalMinutes >= 1) {
    return `= ${totalMinutes.toFixed(2)} minutes (${Math.floor(totalMinutes)}m, ${Math.floor((totalMinutes % 1) * 60)}s)`;
  } else {
    return `= ${totalSeconds.toFixed(2)} seconds`;
  }
}

// ---------- Main function ----------
serve(async (req) => {
  if (req.method === "OPTIONS") return handleOptions();

  const { admin } = createSupabaseClients(req);
  const userId = await getUserId(req);
  if (!userId) {
    return new Response(JSON.stringify({ error: "Unauthorized" }), {
      status: 401,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }

  const url = new URL(req.url);
  // Path: /relationships/stats -> /stats, etc.
  let path = url.pathname
    .replace(/^\/api/, "")
    .replace(/^\/relationships/, "")
    .replace(/\/+$/, "") || "/";

  async function getActiveRelationship() {
    const { data } = await admin
      .from("relationships")
      .select("*")
      .or(`user_id.eq.${userId},partner_id.eq.${userId}`)
      .eq("status", "active")
      .maybeSingle();
    return data;
  }

  function getPartnerId(rel: any) {
    return rel.user_id === userId ? rel.partner_id : rel.user_id;
  }

  // GET /relationships/stats
  if (path === "/stats" && req.method === "GET") {
    const relationship = await getActiveRelationship();
    if (!relationship) {
      return new Response(JSON.stringify({ error: "No active relationship found" }), {
        status: 404,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const partnerId = getPartnerId(relationship);

    // User profile (created_at)
    const { data: userData } = await admin
      .from("profiles")
      .select("created_at")
      .eq("id", userId)
      .single();

    // Partner profile (display_name, avatar_url, created_at)
    const { data: partnerProfile } = await admin
      .from("profiles")
      .select("display_name, avatar_url, created_at")
      .eq("id", partnerId)
      .single();
    const partnerDisplay = partnerProfile?.display_name || "Partner";
    const partnerAvatar = partnerProfile?.avatar_url || null;

    // Counts
    const { count: cravingsCount } = await admin
      .from("cravings")
      .select("*", { count: "exact", head: true })
      .eq("relationship_id", relationship.id)
      .is("archived_at", null);

    const { count: lettersSent } = await admin
      .from("love_letters")
      .select("*", { count: "exact", head: true })
      .eq("relationship_id", relationship.id)
      .eq("sender_id", userId);

    const { count: lettersReceived } = await admin
      .from("love_letters")
      .select("*", { count: "exact", head: true })
      .eq("relationship_id", relationship.id)
      .neq("sender_id", userId);

    // Durations
    const now = new Date();
    const accountCreated = new Date(userData?.created_at || now);
    const accountAge = formatDuration(accountCreated, now);

    const pairedAt = relationship.paired_at ? new Date(relationship.paired_at) : null;
    const anniversaryDate = relationship.anniversary_date ? new Date(relationship.anniversary_date) : null;

    let togetherDuration = 'Not yet';
    let togetherConversion = '';
    if (pairedAt) {
      togetherDuration = formatDuration(pairedAt, now);
      togetherConversion = getConversion(pairedAt, now);
    }

    let anniversaryDuration = 'Not set';
    let anniversaryConversion = '';
    let nextAnniversary = null;
    let daysUntilAnniversary = null;
    let nextMonthsary = null;
    let daysUntilMonthsary = null;

    if (anniversaryDate) {
      // Last anniversary
      let lastAnniversary = new Date(anniversaryDate);
      while (lastAnniversary > now) {
        lastAnniversary.setFullYear(lastAnniversary.getFullYear() - 1);
      }
      if (now.getFullYear() - lastAnniversary.getFullYear() > 0) {
        lastAnniversary.setFullYear(now.getFullYear());
        if (lastAnniversary > now) {
          lastAnniversary.setFullYear(lastAnniversary.getFullYear() - 1);
        }
      }
      const durationMs = now.getTime() - lastAnniversary.getTime();
      if (durationMs > 0) {
        anniversaryDuration = formatDuration(lastAnniversary, now);
        anniversaryConversion = getConversion(lastAnniversary, now);
      } else {
        anniversaryDuration = 'Just started';
      }

      // Next anniversary
      let next = new Date(anniversaryDate);
      next.setFullYear(now.getFullYear());
      if (next < now) {
        next.setFullYear(now.getFullYear() + 1);
      }
      nextAnniversary = next.toISOString().split('T')[0];
      daysUntilAnniversary = Math.ceil((next.getTime() - now.getTime()) / (1000 * 60 * 60 * 24));
      if (daysUntilAnniversary < 0) daysUntilAnniversary = 0;

      // Next monthsary
      const dayOfMonth = anniversaryDate.getDate();
      let candidate = new Date(now);
      candidate.setDate(dayOfMonth);
      if (candidate < now) {
        candidate.setMonth(candidate.getMonth() + 1);
      }
      if (candidate.getDate() !== dayOfMonth) {
        candidate.setMonth(candidate.getMonth() + 1);
        candidate.setDate(dayOfMonth);
      }
      if (candidate.getDate() !== dayOfMonth) {
        candidate = new Date(now);
        candidate.setMonth(candidate.getMonth() + 1);
        candidate.setDate(1);
      }
      nextMonthsary = candidate.toISOString().split('T')[0];
      daysUntilMonthsary = Math.ceil((candidate.getTime() - now.getTime()) / (1000 * 60 * 60 * 24));
      if (daysUntilMonthsary < 0) daysUntilMonthsary = 0;
    }

    return new Response(
      JSON.stringify({
        user: {
          id: userId,
          account_created: userData?.created_at || now.toISOString(),
          account_age: accountAge,
        },
        relationship: {
          id: relationship.id,
          paired_at: relationship.paired_at,
          anniversary_date: relationship.anniversary_date,
          together_duration: togetherDuration,
          together_conversion: togetherConversion,
          anniversary_duration: anniversaryDuration,
          anniversary_conversion: anniversaryConversion,
          next_anniversary: nextAnniversary,
          days_until_anniversary: daysUntilAnniversary,
          next_monthsary: nextMonthsary,
          days_until_monthsary: daysUntilMonthsary,
          status: relationship.status,
        },
        partner: {
          id: partnerId,
          display_name: partnerDisplay,
          avatar_url: partnerAvatar,
          account_created: partnerProfile?.created_at ?? null,
        },
        stats: {
          cravings: cravingsCount || 0,
          letters_sent: lettersSent || 0,
          letters_received: lettersReceived || 0,
        },
      }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }

  // GET /relationships/me
  if (path === "/me" && req.method === "GET") {
    const relationship = await getActiveRelationship();
    if (!relationship) {
      return new Response(JSON.stringify({ error: "No active relationship" }), {
        status: 404,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }
    const partnerId = getPartnerId(relationship);
    const { data: partnerProfile } = await admin
      .from("profiles")
      .select("display_name")
      .eq("id", partnerId)
      .single();
    return new Response(
      JSON.stringify({
        relationship,
        partner: { id: partnerId, display_name: partnerProfile?.display_name || "Partner" },
      }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }

  // GET /relationships/pending
  if (path === "/pending" && req.method === "GET") {
    const { data } = await admin
      .from("relationships")
      .select("invite_code")
      .eq("user_id", userId)
      .eq("status", "pending")
      .limit(1)
      .maybeSingle();
    if (!data) {
      return new Response(JSON.stringify({ error: "No pending invite" }), {
        status: 404,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }
    return new Response(JSON.stringify(data), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }

  // POST /relationships/invite
  if (path === "/invite" && req.method === "POST") {
    if (await isPaired(admin, userId)) {
      return alreadyPaired("You're already paired");
    }
    // One open invite per person: hand back the one that exists instead of piling up codes
    const { data: existing } = await admin
      .from("relationships")
      .select("invite_code")
      .eq("user_id", userId)
      .eq("status", "pending")
      .limit(1)
      .maybeSingle();
    if (existing) {
      return new Response(JSON.stringify({ invite_code: existing.invite_code }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }
    let inviteCode = "";
    for (let attempt = 0; attempt < 3; attempt++) {
      inviteCode = newInviteCode();
      const { error } = await admin
        .from("relationships")
        .insert({ user_id: userId, invite_code: inviteCode, status: "pending" });
      if (!error) break;
      // 23505: the code is already taken (unique invite_code), so draw another
      if (error.code !== "23505" || attempt === 2) return serverError("invite", error);
    }
    return new Response(JSON.stringify({ invite_code: inviteCode }), {
      status: 201,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }

  // POST /relationships/join
  if (path === "/join" && req.method === "POST") {
    const { invite_code } = await req.json();
    const { data: pending } = await admin
      .from("relationships")
      .select("*")
      .eq("invite_code", invite_code?.trim().toUpperCase())
      .eq("status", "pending")
      .maybeSingle();
    if (!pending) {
      return new Response(JSON.stringify({ error: "Invite code not found" }), {
        status: 404,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }
    if (pending.user_id === userId) {
      return new Response(JSON.stringify({ error: "You can't join your own invite" }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }
    if (await isPaired(admin, userId)) {
      return alreadyPaired("You're already paired");
    }
    if (await isPaired(admin, pending.user_id)) {
      return alreadyPaired("This invite is no longer available");
    }
    const { data, error } = await admin
      .from("relationships")
      .update({ partner_id: userId, status: "active", paired_at: new Date().toISOString() })
      .eq("id", pending.id)
      .eq("status", "pending")
      .select()
      .single();
    if (error) {
      // The database trigger blocks a second active relationship (23505).
      if (error.code === "23505") return alreadyPaired("You're already paired");
      return new Response(JSON.stringify({ error: "Couldn't join this invite" }), {
        status: 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }
    // Remove the joiner's own unused invite so it can't pull in someone else later.
    await admin
      .from("relationships")
      .delete()
      .eq("user_id", userId)
      .eq("status", "pending");
    return new Response(JSON.stringify(data), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }

  // PATCH /relationships/anniversary
  if (path === "/anniversary" && req.method === "PATCH") {
    const { anniversary_date } = await req.json();
    const relationship = await getActiveRelationship();
    const { data } = await admin
      .from("relationships")
      .update({ anniversary_date })
      .eq("id", relationship?.id)
      .select()
      .single();
    return new Response(JSON.stringify(data), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }

  // DELETE /relationships
  if (path === "/" && req.method === "DELETE") {
    const relationship = await getActiveRelationship();
    const { error } = await admin
      .from("relationships")
      .delete()
      .eq("id", relationship?.id);
    if (error) return serverError("leave", error);
    return new Response(JSON.stringify({ message: "Relationship deleted" }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }

  // Fallback
  return new Response(JSON.stringify({ error: "Not found" }), {
    status: 404,
    headers: { ...corsHeaders, "Content-Type": "application/json" },
  });
});
