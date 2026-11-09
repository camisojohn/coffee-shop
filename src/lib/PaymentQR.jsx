import { useState } from "react";
import { fmt } from "./format";

// Put your own QR screenshot at  public/payment-qr.png
// Until it exists, a dashed placeholder is shown instead.
export default function PaymentQR({ total }) {
  const [missing, setMissing] = useState(false);
  return (
    <div className="qrbox">
      {missing ? (
        <div className="qrph">Your shop QR goes here.<br />Save it as public/payment-qr.png</div>
      ) : (
        <img src="/qr.jpg" alt="Shop payment QR code" onError={() => setMissing(true)} />
      )}
      <div className="amt">{fmt(total)}</div>
      <p>Scan with your banking or e-wallet app, then show the confirmation at the counter.</p>
    </div>
  );
}
