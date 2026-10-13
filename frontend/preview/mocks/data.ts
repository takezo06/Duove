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
  stats: empty ? { cravings: 0, letters_sent: 0, letters_received: 0 } : { cravings: 12, letters_sent: 7, letters_received: 9 },
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

export const letters = empty
  ? []
  : [
      { id: 'l1', heading: 'For the rainy Tuesday you made better', body: 'You showed up with soup and a terrible umbrella.', sender_id: partner.id, sender_name: 'Mika', recipient_id: me.id, created_at: ago(20), read: false },
      { id: 'l2', heading: 'Six months of you', body: 'Still my favourite person to sit in silence with.', sender_id: me.id, sender_name: 'Jed', recipient_id: partner.id, created_at: ago(400), read: true },
    ];

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
  question: { id: 'q1', question_text: 'What is a small habit of mine you secretly love?', category: 'Deep' },
  yourAnswer: null,
  partnerAnswer: null,
  partnerAnswered: true,
  bothAnswered: false,
  revealed: false,
  partnerName: partner.display_name,
  nextQuestionAvailableIn: 6 * 3600 + 42 * 60,
  preferredCategoryId: null,
};

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

export const notifications = empty ? [] : [
  { id: 'n1', type: 'letter_received', message: 'Mika sent you a letter', created_at: ago(0.3), link: '/letters', reference_id: 'l1', read: false },
  { id: 'n2', type: 'craving_added', message: 'Mika added a craving: "Spicy ramen from the corner place"', created_at: ago(2), link: '/cravings', reference_id: 'c1', read: false },
  { id: 'n3', type: 'craving_fulfilled', message: 'Mika fulfilled a craving: "Strawberry milk"', created_at: ago(30), link: '/cravings', reference_id: 'c5', read: true },
  { id: 'n4', type: 'craving_added', message: 'Mika added a craving: "A really long hug after work"', created_at: ago(80), link: '/cravings', reference_id: 'c3', read: true },
];
