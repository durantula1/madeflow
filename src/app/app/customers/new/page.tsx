import Link from "next/link";
import { CustomerForm } from "@/components/customers/customer-form";
export default function NewCustomerPage() { return <div className="mx-auto max-w-3xl"><Link href="/app/customers" className="text-sm text-muted-foreground hover:text-foreground">← Клиенти</Link><h1 className="mt-5 text-3xl font-semibold tracking-tight">Нов клиент</h1><p className="mt-2 text-muted-foreground">Контактът може да е лице или фирма.</p><section className="mt-7 rounded-2xl border bg-card p-6 shadow-sm sm:p-8"><CustomerForm /></section></div>; }
