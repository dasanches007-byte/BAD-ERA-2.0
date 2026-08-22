import { AddressBook } from "@/components/account/address-book";
import { listCustomerAddresses } from "@/lib/account/queries";
import { getAccountIdentity } from "@/lib/account/session";

export const metadata = { title: "Addresses", robots: { index: false } };

export default async function AccountAddressesPage() {
  const identity = await getAccountIdentity();
  const addresses = identity
    ? await listCustomerAddresses(identity.customerId)
    : [];

  return (
    <section>
      <h2 className="font-display text-display-sm text-ink-strong">Addresses</h2>
      <p className="mt-4 max-w-lg text-sm leading-relaxed text-ink-muted">
        Editing these never changes the address on an order you have already
        placed — those are kept exactly as they were.
      </p>
      <div className="mt-8">
        {identity ? (
          <AddressBook addresses={addresses} />
        ) : (
          <p className="text-sm text-ink-muted">
            Your address book is created with your first order.
          </p>
        )}
      </div>
    </section>
  );
}
