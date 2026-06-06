export function formatDate(dateString: string): string {
  const date = new Date(dateString);
  if (Number.isNaN(date.getTime())) {
    return "-";
  }

  const month = String(date.getMonth() + 1).padStart(2, "0");
  const day = String(date.getDate()).padStart(2, "0");
  const year = date.getFullYear();
  return `${month}/${day}/${year}`;
}

export function ageFromDob(dateString: string): number {
  const dob = new Date(dateString);
  if (Number.isNaN(dob.getTime())) {
    return 0;
  }

  const now = new Date();
  let age = now.getFullYear() - dob.getFullYear();
  const birthdayPassed =
    now.getMonth() > dob.getMonth() ||
    (now.getMonth() === dob.getMonth() && now.getDate() >= dob.getDate());

  if (!birthdayPassed) {
    age -= 1;
  }

  return age;
}
