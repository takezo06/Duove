// Fake data for the mock preview. Pick a scenario with ?scenario=<name> on first load:
//   (default) paired couple with activity
//   empty     paired today, nothing logged yet
//   unpaired  no relationship (pairing screens)
export const scenario = new URLSearchParams(location.search).get('scenario') ?? 'default';
export const paired = scenario !== 'unpaired';
const empty = scenario === 'empty';

const ago = (hours: number) => new Date(Date.now() - hours * 3_600_000).toISOString();
const day = (offset: number) => new Date(Date.now() + offset * 86_400_000).toISOString().slice(0, 10);

export const me = { id: 'u1', email: 'jed@duove.app', display_name: 'Jed', avatar_url: 'https://i.pravatar.cc/160?img=12' };
export const partner = { id: 'p1', display_name: 'Mika', avatar_url: null as string | null };

const pairedAt = empty ? ago(2) : '2025-03-03T09:15:00Z';

export const relationship = {
  id: 'r1',
  user_id: me.id,
  partner_id: partner.id,
  status: 'active',
  paired_at: pairedAt,
  anniversary_date: empty ? null : '2025-02-14',
};

export const stats = {
  user: { id: me.id, account_created: '2025-01-14T08:00:00Z', account_age: '' },
  relationship: {
    ...relationship,
    together_duration: '', together_conversion: '', anniversary_duration: '', anniversary_conversion: '',
    next_anniversary: null, days_until_anniversary: null, next_monthsary: null, days_until_monthsary: null,
  },
  partner: { ...partner, account_created: '2025-02-20T11:30:00Z' },
  stats: {
    cravings: empty ? 0 : 12,
    // counted from the mock letters below so every page agrees
    get letters_sent() { return letters.filter((l) => l.sender_id === me.id).length; },
    get letters_received() { return letters.filter((l) => l.sender_id !== me.id).length; },
  },
};

export let cravings = empty
  ? []
  : [
      { id: 'c1', content: 'Spicy ramen from the corner place', category: 'Food', fulfilled: false, user_id: partner.id, created_at: ago(2) },
      { id: 'c2', content: 'Movie night with the new Ghibli film, blankets and popcorn', category: 'Activity', fulfilled: false, user_id: me.id, created_at: ago(26) },
      { id: 'c3', content: 'A really long hug after work', category: 'Emotional', fulfilled: false, user_id: partner.id, created_at: ago(80) },
      { id: 'c4', content: 'That linen shirt from the thrift store', category: 'Material', fulfilled: false, user_id: partner.id, created_at: ago(100) },
      { id: 'c5', content: 'Strawberry milk', category: 'Food', fulfilled: true, user_id: me.id, created_at: ago(5) },
    ];
export const setCravings = (next: typeof cravings) => { cravings = next; };

const OLDER_HEADINGS = [
  'Postcard from the night train', 'Things I forgot to say at the airport', 'Our first grocery run', 'You, at 2am, explaining black holes',
  'The bench by the river', 'A list of your laughs', 'Sorry about the burnt pancakes', 'What I want for us next year',
  'The day the power went out', 'Your terrible, perfect playlist', 'Notes from the waiting room', 'Happy almost-anniversary',
  'The rain on Sunday', 'Why I kept the ticket stub',
];

export let letters = empty
  ? []
  : [
      { id: 'l1', heading: 'For the rainy Tuesday you made better', message: 'You showed up with soup and a terrible umbrella, and somehow the whole week turned around.\n\nI keep thinking about how you laughed when the umbrella flipped inside out on the steps. I want more Tuesdays like that one.', sender_id: partner.id, sender_name: 'Mika', recipient_name: 'Jed', recipient_id: me.id, created_at: ago(20), opened_at: null, spotify_track_id: '4iV5W9uYEdYUVa79Axb7Rh', spotify_track_name: 'Here Comes the Sun', spotify_artist_name: 'The Beatles' },
      { id: 'l3', heading: 'Thank you for the playlist', message: 'I listened to it on the whole train ride home. Track four made me miss you.', sender_id: me.id, sender_name: 'Jed', recipient_name: 'My love', recipient_id: partner.id, created_at: ago(120), opened_at: null },
      { id: 'l4', heading: 'Things I noticed about you this week', message: 'You hum when you cook. You always leave the last dumpling for me. You fall asleep mid-sentence.', sender_id: partner.id, sender_name: 'Mika', recipient_name: 'Jed', recipient_id: me.id, created_at: ago(300), opened_at: ago(299) },
      { id: 'l2', heading: 'Six months of you', message: 'Still my favourite person to sit in silence with.', sender_id: me.id, sender_name: 'Jed', recipient_name: 'Mika', recipient_id: partner.id, created_at: ago(900), opened_at: ago(899), spotify_track_id: '3n3Ppam7vgaVa1iaRUc9Lp', spotify_track_name: 'Mr. Brightside', spotify_artist_name: 'The Killers' },
      { id: 'l5', heading: 'Before your big exam', message: 'You have studied more than anyone I know. Go in there and be brilliant. Dinner is on me after.', sender_id: partner.id, sender_name: 'M.', recipient_name: 'My favourite nerd', recipient_id: me.id, created_at: ago(1500), opened_at: ago(1499) },
      ...Array.from({ length: 40 }, (_, i) => {
        const mine = i % 3 === 1;
        return {
          id: `lx${i}`,
          heading: OLDER_HEADINGS[i % OLDER_HEADINGS.length],
          message: 'I found this in my notes app and wanted you to have it properly, on paper, or as close as we can get.',
          sender_id: mine ? me.id : partner.id,
          sender_name: mine ? 'Jed' : 'Mika',
          recipient_name: mine ? 'Mika' : 'Jed',
          recipient_id: mine ? partner.id : me.id,
          created_at: ago(1700 + i * 170),
          // two older letters from Mika are still sealed, to show it in the envelope box
          opened_at: i === 2 || i === 9 ? null : ago(1700 + i * 170 - 1),
        };
      }),
    ];

export const setLetters = (next: typeof letters) => { letters = next; };

export const cycles = empty ? [] : [
  { id: 'cy1', user_id: me.id, start_date: day(-54), end_date: day(-50) },
  { id: 'cy2', user_id: me.id, start_date: day(-26), end_date: day(-22) },
];

export const prediction = empty ? null : {
  nextPeriodStart: day(2), nextPeriodEnd: day(6), ovulationDay: day(-12),
  fertileWindowStart: day(-14), fertileWindowEnd: day(-8),
  cycleDay: 27, daysUntilPeriod: 2, phase: 'luteal', averageCycleLength: 28, averageBleedingDays: 5,
};

export const question = empty ? null : {
  question: { id: 'q1', question_text: 'What is a small habit of mine you secretly love?', category_id: 'cat-deep' },
  yourAnswer: null as { answer_text: string; submitted_at: string } | null,
  partnerAnswer: null as { answer_text: string; submitted_at: string } | null,
  partnerAnswered: true,
  bothAnswered: false,
  revealed: false,
  partnerName: partner.display_name,
  nextQuestionAvailableIn: 6 * 3600 + 42 * 60,
  preferredCategoryId: null as string | null,
};

// Mika's answer to today's question, revealed once you answer (matches qaHistory h1)
export const qaPartnerAnswer = { answer_text: 'The way you hum while cooking.', submitted_at: ago(3) };

export const qaCategories = [
  { id: 'cat-deep', name: 'deep', description: 'Questions that go a little further', icon: 'brain' },
  { id: 'cat-fun', name: 'fun', description: 'Light ones for a lazy evening', icon: 'smile' },
  { id: 'cat-dreams', name: 'dreams', description: 'Plans, wishes and somedays', icon: 'compass' },
  { id: 'cat-memories', name: 'memories', description: 'Looking back at the two of you', icon: 'heart' },
];

const qa = (id: string, offset: number, text: string, mine: string | null, theirs: string | null) => ({
  id, assigned_date: day(offset), revealed_at: mine && theirs ? ago(-offset * 24) : null,
  question: { id: `q-${id}`, question_text: text, category_id: 'c' },
  your_answer: mine && { answer_text: mine, submitted_at: ago(-offset * 24) },
  partner_answer: theirs && { answer_text: mine ? theirs : null, submitted_at: ago(-offset * 24) },
  both_answered: !!(mine && theirs),
});

export const qaHistory = empty ? [] : [
  qa('h1', 0, 'What is a small habit of mine you secretly love?', null, 'The way you hum while cooking.'),
  qa('h2', -1, 'Where would you take me for a perfect lazy Sunday?', 'The bookstore café, then a nap.', 'Pancakes at home, no phones until noon.'),
  qa('h3', -2, 'What song reminds you of us?', 'Anything from that road trip playlist.', null),
  qa('h4', -40, 'What did you think of me the first time we met?', 'That you laughed louder than anyone in the room.', 'You looked like you were about to say something smart.'),
];

const OLDER_CRAVINGS = ['Mango sticky rice', 'A slow Sunday walk', 'Hot chocolate', 'Rewatching our first movie', 'Garlic bread'];

export const notifications = empty ? [] : [
  { id: 'n1', type: 'letter_received', message: 'Mika sent you a letter', created_at: ago(0.3), link: '/letters', reference_id: 'l1', read: false },
  { id: 'n2', type: 'craving_added', message: 'Mika added a craving: "Spicy ramen from the corner place"', created_at: ago(2), link: '/cravings', reference_id: 'c1', read: false },
  { id: 'n3', type: 'craving_fulfilled', message: 'Mika fulfilled a craving: "Strawberry milk"', created_at: ago(30), link: '/cravings', reference_id: 'c5', read: true },
  { id: 'n4', type: 'craving_added', message: 'Mika added a craving: "A really long hug after work"', created_at: ago(80), link: '/cravings', reference_id: 'c3', read: true },
  // older history, so the list has more than one page to lazy load
  ...Array.from({ length: 50 }, (_, i) =>
    i % 2
      ? { id: `nx${i}`, type: 'letter_received', message: 'Mika sent you a letter', created_at: ago(100 + i * 40), link: '/letters', reference_id: `lx${i}`, read: true }
      : { id: `nx${i}`, type: 'craving_added', message: `Mika added a craving: "${OLDER_CRAVINGS[(i / 2) % OLDER_CRAVINGS.length]}"`, created_at: ago(100 + i * 40), link: '/cravings', reference_id: `cx${i}`, read: true },
  ),
];
