/**
 * Dummy data: 100-card website IA open card sort, 30 simulated participants.
 * Run from /server:  npx ts-node prisma/seed-dummy.ts
 */
import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

// ── 100 cards in 9 thematic clusters ──────────────────────────────────────────

const CARD_GROUPS = [
  {
    group: 'About',
    cards: [
      'Our story', 'Mission and values', 'Leadership team', 'Company history',
      'Awards and recognition', 'Press releases', 'Career opportunities', 'Partner with us',
    ],
  },
  {
    group: 'Products',
    cards: [
      'Product catalog', 'New arrivals', 'Best sellers', 'Product comparison',
      'Technical specifications', 'Product reviews', 'Accessories', 'Bundles and kits',
      'Product videos', 'User manuals', 'Warranty information', 'Product registration',
      'Discontinued products', 'Bulk ordering', 'Custom orders',
    ],
  },
  {
    group: 'Support',
    cards: [
      'Help center', 'Contact support', 'Live chat', 'Submit a ticket',
      'FAQs', 'Troubleshooting guides', 'Video tutorials', 'Community forum',
      'Report a problem', 'System status', 'Accessibility features', 'Feedback',
    ],
  },
  {
    group: 'Account',
    cards: [
      'Sign in', 'Create account', 'Forgot password', 'Account settings',
      'Order history', 'Saved items', 'Addresses', 'Payment methods',
      'Notifications', 'Privacy settings',
    ],
  },
  {
    group: 'Orders & Shipping',
    cards: [
      'Track my order', 'Shipping options', 'Delivery times', 'International shipping',
      'Returns and exchanges', 'Refund policy', 'Cancel an order', 'Gift wrapping',
      'Order confirmation', 'Invoice download', 'Lost package', 'Change delivery address',
    ],
  },
  {
    group: 'Pricing & Offers',
    cards: [
      'Current promotions', 'Discount codes', 'Loyalty program', 'Gift cards',
      'Price matching', 'Seasonal sales', 'Newsletter signup', 'Refer a friend',
      'Clearance items', 'Bundle deals',
    ],
  },
  {
    group: 'Blog & Resources',
    cards: [
      'Latest articles', 'How-to guides', 'Industry news', 'Case studies',
      'White papers', 'Webinars', 'Podcast', 'Infographics',
      'Templates', 'Glossary', 'Research reports', 'Expert interviews',
    ],
  },
  {
    group: 'Legal & Policies',
    cards: [
      'Privacy policy', 'Terms of service', 'Cookie policy', 'Return policy',
      'Shipping policy', 'Accessibility statement', 'Security information',
      'Data deletion request', 'GDPR compliance', 'Intellectual property', 'User agreement',
    ],
  },
  {
    group: 'Contact & Locations',
    cards: [
      'Contact us', 'Find a store', 'Store hours', 'Request a callback',
      'Media inquiries', 'Investor relations', 'Office locations',
      'Directions', 'Social media', 'Mailing address',
    ],
  },
];

// Label variants per group (participants use different words for the same concept)
const CATEGORY_LABELS: Record<string, string[]> = {
  About:                ['About us', 'Company info', 'Who we are', 'About', 'Our company', 'Background'],
  Products:             ['Products', 'Our products', 'Shop', 'Catalog', 'Items', 'What we sell'],
  Support:              ['Support', 'Help', 'Customer support', 'Get help', 'Assistance', 'Help & support'],
  Account:              ['My account', 'Account', 'Profile', 'Login area', 'User area', 'My profile'],
  'Orders & Shipping':  ['Orders', 'Orders & shipping', 'Shipping', 'Delivery', 'My orders', 'Order management'],
  'Pricing & Offers':   ['Deals', 'Offers', 'Promotions', 'Pricing', 'Sales & offers', 'Discounts'],
  'Blog & Resources':   ['Resources', 'Blog', 'Learning', 'Content', 'Articles', 'Knowledge base'],
  'Legal & Policies':   ['Legal', 'Policies', 'Terms', 'Legal & policies', 'Compliance', 'Legal info'],
  'Contact & Locations':['Contact', 'Contact us', 'Find us', 'Locations', 'Get in touch', 'Reach us'],
};

// Cards that are often confused across groups (realistic noise)
const CONFUSION: Record<string, string[]> = {
  Support:              ['Contact & Locations', 'Legal & Policies'],
  'Legal & Policies':   ['Support', 'Account'],
  'Orders & Shipping':  ['Account', 'Pricing & Offers'],
  'Pricing & Offers':   ['Orders & Shipping', 'Products'],
  'Blog & Resources':   ['Products', 'Support'],
  'Contact & Locations':['Support', 'About'],
  About:                ['Contact & Locations', 'Blog & Resources'],
  Products:             ['Pricing & Offers', 'Blog & Resources'],
  Account:              ['Orders & Shipping', 'Legal & Policies'],
};

// Deterministic pseudo-random (so re-runs produce identical data)
function makeRng(seed: number) {
  let s = seed;
  return () => {
    s = Math.imul(s ^ (s >>> 16), 0x45d9f3b);
    s = Math.imul(s ^ (s >>> 16), 0x45d9f3b);
    s ^= s >>> 16;
    return (s >>> 0) / 0x100000000;
  };
}

function pick<T>(arr: T[], rng: () => number): T {
  return arr[Math.floor(rng() * arr.length)];
}

async function main() {
  const researcher = await prisma.researcher.findUnique({ where: { username: 'admin' } });
  if (!researcher) {
    console.error('Admin user not found — run:  npx ts-node prisma/seed.ts');
    process.exit(1);
  }

  // ── Study ──────────────────────────────────────────────────────────────────
  console.log('Creating study…');
  const study = await prisma.study.create({
    data: {
      researcherId: researcher.id,
      title: 'Website IA Card Sort (100 cards)',
      description: 'Dummy study for testing analysis features. 100 cards, 30 simulated participants.',
      type: 'OPEN',
      status: 'PUBLISHED',
      instructions: 'Sort the cards into groups that make sense to you, then name each group.',
    },
  });

  // ── Cards ──────────────────────────────────────────────────────────────────
  console.log('Creating 100 cards…');
  const allCardNames = CARD_GROUPS.flatMap((g) => g.cards);
  const cardRecords = await Promise.all(
    allCardNames.map((name) => prisma.card.create({ data: { studyId: study.id, name } }))
  );
  const cardByName = new Map(cardRecords.map((c) => [c.name, c]));
  const cardToGroup = new Map<string, string>();
  for (const g of CARD_GROUPS)
    for (const name of g.cards)
      cardToGroup.set(name, g.group);

  // ── Participants ────────────────────────────────────────────────────────────
  console.log('Simulating 30 participants…');
  const baseTime = Date.now();

  for (let p = 0; p < 30; p++) {
    const rng = makeRng(p * 1_299_827 + 7);
    const startedAt  = new Date(baseTime - (30 - p) * 86_400_000 - Math.floor(rng() * 7_200_000));
    const durationSecs = 200 + Math.floor(rng() * 500); // 3–12 min
    const completedAt = new Date(startedAt.getTime() + durationSecs * 1000);

    const session = await prisma.session.create({
      data: { studyId: study.id, consentGiven: true, startedAt, completedAt, durationSecs, submitted: true },
    });

    // Some participants merge similar groups together
    const mergeMap = new Map<string, string>();
    if (rng() < 0.30) mergeMap.set('Legal & Policies',   'Support');
    if (rng() < 0.25) mergeMap.set('Contact & Locations', 'Support');
    if (rng() < 0.20) mergeMap.set('Pricing & Offers',   'Orders & Shipping');
    if (rng() < 0.15) mergeMap.set('Blog & Resources',   'About');
    const canonical = (g: string): string => mergeMap.has(g) ? canonical(mergeMap.get(g)!) : g;

    // Create this participant's categories
    const usedGroups = [...new Set(CARD_GROUPS.map((g) => canonical(g.group)))];
    const catRecords = await Promise.all(
      usedGroups.map((g) =>
        prisma.category.create({
          data: {
            studyId: study.id,
            sessionId: session.id,
            label: pick(CATEGORY_LABELS[g] ?? [g], rng),
          },
        })
      )
    );
    const catByGroup = new Map(usedGroups.map((g, i) => [g, catRecords[i]]));

    // Sort every card
    for (const card of cardRecords) {
      const ideal   = cardToGroup.get(card.name)!;
      const target  = canonical(ideal);
      const roll    = rng();

      let catId: number | null = null;

      if (roll < 0.82) {
        // 82 %: correct group
        catId = catByGroup.get(target)?.id ?? null;
      } else if (roll < 0.94) {
        // 12 %: confused with a neighbouring group
        const confused = CONFUSION[ideal];
        if (confused) {
          const alt = canonical(pick(confused, rng));
          catId = catByGroup.get(alt)?.id ?? catByGroup.get(target)?.id ?? null;
        } else {
          catId = catByGroup.get(target)?.id ?? null;
        }
      }
      // 6 %: left unsorted (catId stays null)

      await prisma.sortItem.create({
        data: { sessionId: session.id, cardId: card.id, categoryId: catId },
      });
    }

    process.stdout.write(`\r  Participant ${p + 1}/30`);
  }

  console.log('\n\nDone!');
  console.log(`Study ID : ${study.id}`);
  console.log(`Results  : http://localhost:5173/studies/${study.id}/results`);
}

main()
  .catch((e) => { console.error(e); process.exit(1); })
  .finally(() => prisma.$disconnect());
