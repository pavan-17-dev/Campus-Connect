// Sample statistics for the admin dashboard UI.
export const adminStats = {
  totalStudents: 2847,
  totalListings: 1236,
  activeListings: 894,
  reportedProducts: 17,
};

export const listingsPerMonth = [
  { month: 'Jun', value: 86 },
  { month: 'Jul', value: 142 },
  { month: 'Aug', value: 231 },
  { month: 'Sep', value: 198 },
  { month: 'Oct', value: 264 },
  { month: 'Nov', value: 315 },
];

export const recentActivities = [
  { id: 1, icon: 'bi-person-plus', text: 'Meera Joshi registered from BMS College of Engineering', time: '5 min ago', tone: 'primary' },
  { id: 2, icon: 'bi-box-seam', text: 'Aarav Sharma listed "Engineering Mathematics – B.S. Grewal"', time: '22 min ago', tone: 'success' },
  { id: 3, icon: 'bi-flag', text: 'A listing was reported for "misleading description"', time: '1 hour ago', tone: 'danger' },
  { id: 4, icon: 'bi-check2-circle', text: 'Priya Nair marked "Casio fx-991ES" as sold', time: '3 hours ago', tone: 'info' },
  { id: 5, icon: 'bi-person-plus', text: 'Vikram Rao registered from PES University', time: '5 hours ago', tone: 'primary' },
];

export const adminUsers = [
  { id: 1, name: 'Aarav Sharma', email: 'aarav.s@bmsce.ac.in', college: 'BMS College of Engineering', listings: 12, status: 'Active' },
  { id: 2, name: 'Priya Nair', email: 'priya.n@bmsce.ac.in', college: 'BMS College of Engineering', listings: 7, status: 'Active' },
  { id: 3, name: 'Rohan Kulkarni', email: 'rohan.k@rvce.edu.in', college: 'RV College of Engineering', listings: 5, status: 'Active' },
  { id: 4, name: 'Sneha Reddy', email: 'sneha.r@pes.edu', college: 'PES University', listings: 9, status: 'Pending' },
  { id: 5, name: 'Karthik Iyer', email: 'karthik.i@bmsce.ac.in', college: 'BMS College of Engineering', listings: 3, status: 'Suspended' },
];

export const reportedProducts = [
  { id: 9, reason: 'Item already sold', reports: 3 },
  { id: 15, reason: 'Price looks suspicious', reports: 2 },
  { id: 13, reason: 'Misleading description', reports: 1 },
];
