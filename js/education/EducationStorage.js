// Browser-only educational DEMO adapter. Never reuse game storage or use for real student records.
const KEY = 'unicorn_grade_space_v1';
export const educationStorage = {
  read() { return JSON.parse(localStorage.getItem(KEY)); },
  write(value) { localStorage.setItem(KEY, JSON.stringify(value)); }
};
