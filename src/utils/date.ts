export function today() {
  return new Date().toLocaleDateString('sv-SE');
}

export function monthKey(date: string) {
  return date.slice(0, 7);
}
