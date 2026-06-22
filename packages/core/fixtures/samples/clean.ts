// Sample: intentionally clean — the matcher must find zero species here.
export function add(a: number, b: number): number {
  return a + b;
}

export function greet(name: string): string {
  if (name === "") {
    return "hello";
  }
  return `hello ${name}`;
}
