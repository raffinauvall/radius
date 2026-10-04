const plusBenefits = [
  { title: 'Member ticket pricing', description: 'Harga khusus Radius+ untuk event yang berpartisipasi.' },
  { title: 'Priority registration', description: 'Akses pendaftaran lebih awal untuk event terpilih.' },
  { title: 'Member-only events', description: 'Kegiatan khusus untuk member Radius+.' },
  { title: 'Merch & partner benefits', description: 'Penawaran produk dan benefit dari partner Radius.' }
];
export const membershipSeed = {
  plans: [
    { key: 'COMMUNITY', name: 'Radius Community', price: 0, interval: null, description: 'Event updates, community access, and selected partner offers.', benefits: [
      { title: 'Event updates', description: 'Informasi event Radius berikutnya.' },
      { title: 'Community access', description: 'Akses ke komunitas Radius.' },
      { title: 'Partner offers', description: 'Penawaran partner untuk komunitas Radius.' }
    ] },
    { key: 'PLUS', name: 'Radius+', price: 99000, interval: 'month', description: 'Member pricing, priority registration, and member-only events.', benefits: plusBenefits },
    { key: 'YEARLY', name: 'Radius+ Yearly', price: 999000, interval: 'year', description: 'A full year of Radius+ at a better annual price.', benefits: plusBenefits }
  ]
};
