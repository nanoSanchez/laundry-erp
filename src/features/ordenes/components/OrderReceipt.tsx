import { receiptBusiness } from "@/config/receipt.config";

import type { OrderDetail } from "../hooks/useOrder";

interface OrderReceiptProps {
  order: OrderDetail;
  paidAmount: number;
}

function formatAmount(amount: number) {
  return `Bs ${amount.toFixed(2)}`;
}

function formatDateTime(value: string) {
  return new Date(value).toLocaleString("es-BO", {
    dateStyle: "short",
    timeStyle: "short",
  });
}

export default function OrderReceipt({ order, paidAmount }: OrderReceiptProps) {
  const balance = Math.max(0, order.total - paidAmount);

  return (
    <article className="order-receipt" aria-label="Comprobante de la orden">
      <header className="order-receipt__header">
        <p className="order-receipt__business-name">{receiptBusiness.name}</p>
        {receiptBusiness.branchName && (
          <p className="order-receipt__branch">{receiptBusiness.branchName}</p>
        )}
        <p>COMPROBANTE DE RECEPCIÓN</p>
      </header>

      <div className="order-receipt__separator" />

      <dl className="order-receipt__details">
        <div>
          <dt>Orden</dt>
          <dd>{order.order_number}</dd>
        </div>
        <div>
          <dt>Fecha</dt>
          <dd>{formatDateTime(order.created_at)}</dd>
        </div>
        <div>
          <dt>Cliente</dt>
          <dd>{order.client?.name ?? "Cliente no disponible"}</dd>
        </div>
        <div>
          <dt>Teléfono</dt>
          <dd>{order.client?.phone || "-"}</dd>
        </div>
        <div>
          <dt>Entrega estimada</dt>
          <dd>{order.estimated_delivery_at ? formatDateTime(order.estimated_delivery_at) : "-"}</dd>
        </div>
      </dl>

      <div className="order-receipt__separator" />

      <table className="order-receipt__items">
        <thead>
          <tr>
            <th>Prenda</th>
            <th>Cant.</th>
            <th>P. unit.</th>
            <th>Subtotal</th>
          </tr>
        </thead>
        <tbody>
          {order.items.map((item) => (
            <tr key={item.id}>
              <td>
                {item.garment_type?.name ?? "Prenda no disponible"}
                {item.observations && <small>{item.observations}</small>}
              </td>
              <td>{item.quantity}</td>
              <td>{formatAmount(item.unit_price)}</td>
              <td>{formatAmount(item.subtotal)}</td>
            </tr>
          ))}
        </tbody>
      </table>

      <div className="order-receipt__separator" />

      <dl className="order-receipt__totals">
        <div>
          <dt>Subtotal</dt>
          <dd>{formatAmount(order.subtotal)}</dd>
        </div>
        <div>
          <dt>Descuento</dt>
          <dd>{formatAmount(order.discount)}</dd>
        </div>
        <div className="order-receipt__total">
          <dt>Total</dt>
          <dd>{formatAmount(order.total)}</dd>
        </div>
        <div>
          <dt>Pagado</dt>
          <dd>{formatAmount(paidAmount)}</dd>
        </div>
        <div className="order-receipt__balance">
          <dt>Saldo pendiente</dt>
          <dd>{formatAmount(balance)}</dd>
        </div>
      </dl>

      {order.observations && (
        <>
          <div className="order-receipt__separator" />
          <section className="order-receipt__observations">
            <strong>Observaciones</strong>
            <p>{order.observations}</p>
          </section>
        </>
      )}

      <footer className="order-receipt__footer">Gracias por su preferencia.</footer>
    </article>
  );
}
