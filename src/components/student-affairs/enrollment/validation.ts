/**
 * Validation helpers for Student Affairs forms.
 */

export function isValidCambodiaPhone(phone: string): boolean {
  if (!phone.trim()) return false;
  const cleaned = phone.replace(/[\s\-()]/g, "");
  return /^(?:\+855|855|0)[1-9]\d{7,8}$/.test(cleaned);
}

export function calculateAge(dob: string): number {
  const birth = new Date(dob);
  const today = new Date();
  let age = today.getFullYear() - birth.getFullYear();
  const monthDiff = today.getMonth() - birth.getMonth();
  if (monthDiff < 0 || (monthDiff === 0 && today.getDate() < birth.getDate())) {
    age--;
  }
  return age;
}

export function validateDateOfBirth(dob: string): string | null {
  if (!dob) return "Date of Birth is required.";
  const birth = new Date(dob);
  if (isNaN(birth.getTime())) return "Invalid date of birth format.";

  const today = new Date();
  if (birth > today) return "Date of birth cannot be in the future.";

  const age = calculateAge(dob);
  if (age < 15) return "Student must be at least 15 years old.";
  if (age > 85) return "Please enter a realistic date of birth (under 85 years).";

  return null;
}

export function isValidEmail(email: string): boolean {
  if (!email.trim()) return true; // optional in backend
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email.trim());
}

export function isValidGpa(gpaStr: string): boolean {
  if (!gpaStr.trim()) return true; // optional
  const num = Number(gpaStr.trim());
  return !isNaN(num) && num >= 0 && num <= 4.0;
}

export function isValidGradYear(yearStr: string): boolean {
  if (!yearStr.trim()) return true; // optional
  const year = Number(yearStr.trim());
  const maxYear = new Date().getFullYear() + 1;
  return !isNaN(year) && year >= 1950 && year <= maxYear;
}
