// Sample buyer–seller conversations for the messaging UI.
const conversations = [
  {
    id: 101,
    productId: 3,
    participant: { id: 3, name: 'Rohan Kulkarni', avatar: 'RK', college: 'RV College of Engineering', online: true },
    unread: 2,
    messages: [
      { id: 1, from: 'me', text: 'Hi Rohan! Is the Dell Inspiron still available?', at: '2026-11-25T09:12:00' },
      { id: 2, from: 'them', text: 'Hey! Yes, it is. Are you looking for it for coding?', at: '2026-11-25T09:15:00' },
      { id: 3, from: 'me', text: 'Yes, mostly for my DSA and web dev projects. How is the battery?', at: '2026-11-25T09:16:00' },
      { id: 4, from: 'them', text: 'Gives around 4 hours with normal use. I can show you a battery report.', at: '2026-11-25T09:20:00' },
      { id: 5, from: 'them', text: 'Can we meet at the main gate tomorrow at 4 PM?', at: '2026-11-25T09:21:00' },
    ],
  },
  {
    id: 102,
    productId: 2,
    participant: { id: 2, name: 'Priya Nair', avatar: 'PN', college: 'BMS College of Engineering', online: false },
    unread: 0,
    messages: [
      { id: 1, from: 'me', text: 'Hi Priya, would you take ₹700 for the calculator?', at: '2026-11-24T18:02:00' },
      { id: 2, from: 'them', text: 'I can do ₹725, it is practically new 🙂', at: '2026-11-24T18:30:00' },
      { id: 3, from: 'me', text: 'Deal! I will pick it up after the 2 PM lab.', at: '2026-11-24T18:31:00' },
    ],
  },
  {
    id: 103,
    productId: 11,
    participant: { id: 4, name: 'Sneha Reddy', avatar: 'SR', college: 'PES University', online: true },
    unread: 1,
    messages: [
      { id: 1, from: 'me', text: 'Is the lamp rechargeable?', at: '2026-11-23T21:00:00' },
      { id: 2, from: 'them', text: 'Yes! Lasts about 6 hours on a single charge.', at: '2026-11-23T21:05:00' },
    ],
  },
];

export default conversations;
