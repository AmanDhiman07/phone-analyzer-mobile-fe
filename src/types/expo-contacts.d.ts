declare module "expo-contacts" {
  export interface Contact {
    id?: string;
    name?: string;
    phoneNumbers?: { number: string; digits?: string }[];
    emails?: { email: string }[];
    [key: string]: unknown;
  }

  export const Fields: {
    Name: string;
    PhoneNumbers: string;
    Emails: string;
  };

  export function requestPermissionsAsync(): Promise<{ status: "granted" | "denied" }>;
  export function getContactsAsync(options: {
    fields?: string[];
  }): Promise<{ data: Contact[] }>;
  export function addContactAsync?(contact: Contact): Promise<string>;
}
