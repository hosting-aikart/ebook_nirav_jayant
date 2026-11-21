import { BagDrawer } from "./BagDrawer";
import { OrderSuccessModal } from "./OrderSuccessModal";
import type { Bag } from "../lib/bag";

/** Bag drawer, "added to bag" toast and order confirmation — shared by every storefront page. */
export function BagLayer({ bag, onBrowseBooks }: { bag: Bag; onBrowseBooks: () => void }) {
  return (
    <>
      <BagDrawer
        bag={bag}
        onPaid={(receipt) => {
          bag.clear();
          bag.close();
          bag.showReceipt(receipt);
        }}
        onBrowseBooks={onBrowseBooks}
      />

      {bag.receipt && <OrderSuccessModal order={bag.receipt} onClose={bag.closeReceipt} />}

      {bag.toast && !bag.isOpen && (
        <div className="still-toast" role="status">
          <span>{bag.toast}</span>
          <button type="button" className="still-toast-btn" onClick={bag.open}>
            View Bag
          </button>
        </div>
      )}
    </>
  );
}
