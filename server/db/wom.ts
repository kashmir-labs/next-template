import { sql } from "drizzle-orm";
import {
  index,
  integer,
  sqliteTable,
  primaryKey,
  text,
  foreignKey,
} from "drizzle-orm/sqlite-core";

// TODO: FIx namings

const naming_max_length = 50;

export const users = sqliteTable("users", {
  id: integer('id', { mode: 'number' }).primaryKey({ autoIncrement: true }),
  email: text('email', { mode: "text", length: naming_max_length }).notNull().unique(),
  password: text('password', { mode: "text", length: 255 }).notNull(),
  created_at: integer('created_at', { mode: 'timestamp' }).notNull().default(sql`(unixepoch())`),
});

// The books available in the database.
export const books = sqliteTable("books", {
  // The id of the book as an auto-incrementing integer. The ISBN is not used as
  // the primary key even if it is unique because it is a string without a order
  // constraint and that would slow down indexing. The cost is more memory usage
  // and a slower insert time.
  id: integer('id', { mode: 'number' }).primaryKey({ autoIncrement: true }),
  // The unique ISBN of the book as a string.
  isbn: text('isbn', { mode: "text", length: 13 }).notNull().unique(),
});

// The suppliers that have deposited books to be sold.
export const suppliers = sqliteTable("suppliers", {
  // The id of the supplier as an auto-incrementing integer.
  id: integer('id', { mode: 'number' }).primaryKey({ autoIncrement: true }),
  // The unique name of the supplier as a string.
  name: text('name', { mode: "text", length: naming_max_length }).notNull().unique(),
  // Some suppliers are also editors, those are distinguished by the isbn prefix
  // that they use. NULL values mean that the supplier is not an editor.
  editor_isbn_prefix: text('editor_isbn_prefix', { mode: "text", length: 6 }).unique(),
  // The time the supplier was created.
  created_at: integer('created_at', { mode: 'timestamp' }).notNull().default(sql`(unixepoch())`),
  // The Stripe account id of the supplier.
  stripe_account_id: text('stripe_account_id', { mode: "text", length: 255 }).notNull(),
});

// The deposits that a supplier owns. Each deposit is a set of books.
export const suppliers_deposits = sqliteTable("suppliers_deposits", {
  // The id of the supplier that own the deposit.
  supplier_id: integer('supplier_id', { mode: 'number' }).notNull(),
  // The name of the deposit. The name is unique to the supplier.
  name: text('name', { mode: "text", length: naming_max_length }).notNull(),
  // The time the deposit was created.
  created_at: integer('created_at', { mode: 'timestamp' }).notNull().default(sql`(unixepoch())`),
}, (self) => ({
  // Each deposit is distinguished by the supplier who owns it and the name of
  // the deposit.
  primaryKey: primaryKey({
    columns: [self.supplier_id, self.name]
  }),
  // The supplier that owns the deposit.
  supplierReference: foreignKey({
    columns: [self.supplier_id],
    foreignColumns: [suppliers.id],
  }).onDelete("restrict")
    .onUpdate("restrict")
}));

// Table the books that a supplier has deposited.
export const suppliers_deposits_books = sqliteTable("suppliers_deposits_books", {
  // The supplier_id and name relate to the supplier deposit. If the name is 
  // the empty string then the books are not in any deposit.
  deposit_supplier_id: integer('supplier_id', { mode: 'number' }).notNull(),
  deposit_name: text('name', { mode: "text", length: naming_max_length }).notNull(),
  // An optional description of the deposit.
  description: text('description', { mode: "text", length: 255 }),
  // The book that was deposited.
  book_id: integer('book_id', { mode: 'number' }).notNull(),
  // The quantity of books deposited.
  quantity: integer('quantity', { mode: 'number' }).notNull(),
}, (self) => ({
  // The set of books in each supplier deposit is distinguished by the
  // supplier_id, name, and book_id.
  primaryKey: primaryKey({
    columns: [self.deposit_supplier_id, self.deposit_name, self.book_id]
  }),
  // The supplier deposit that the book is in.
  supplierDepositReference: foreignKey({
    columns: [self.deposit_supplier_id, self.deposit_name, self.book_id],
    foreignColumns: [suppliers_deposits.supplier_id, suppliers_deposits.name, books.id],
    // A supplier deposit to be deleted must be empty (its books must be moved
    // to another deposit or set without a deposit).
  }).onDelete("restrict")
    .onUpdate("restrict"),
  // The book that was deposited.
  bookReference: foreignKey({
    columns: [self.book_id],
    foreignColumns: [books.id],
    // A book to be deleted must not be referenced by any supplier deposit.
  }).onDelete("restrict")
    .onUpdate("restrict")
}));

// Sellers which take books from suppliers to sell them.
export const sellers = sqliteTable("sellers", {
  // The id of the seller as an auto-incrementing integer.
  id: integer('id', { mode: 'number' }).primaryKey({ autoIncrement: true }),
  // The unique name of the seller as a string.
  name: text('name', { mode: "text", length: naming_max_length }).notNull().unique(),
  // The time the seller was created.
  created_at: integer('created_at', { mode: 'timestamp' }).notNull().default(sql`(unixepoch())`),
  // The Stripe account id of the seller.
  stripe_account_id: text('stripe_account_id', { mode: "text", length: 255 }).notNull(),
});

export const sellers_deposits = sqliteTable("sellers_deposits", {
  seller_id: integer('seller_id', { mode: 'number' }).notNull(),
  name: text('name', { mode: "text", length: 255 }).notNull().unique(),
  created_at: integer('created_at', { mode: 'timestamp' }).notNull(),
}, (self) => ({
  primaryKey: primaryKey({
    columns: [self.seller_id, self.name]
  }),
  sellerReference: foreignKey({
    columns: [self.seller_id],
    foreignColumns: [sellers.id],
  }).onDelete('cascade').onUpdate('cascade'),
}));

export const deposits_transactions = sqliteTable("deposits_transactions", {
  supplier_id: integer('supplier_id', { mode: 'number' }).notNull(),
  seller_id: integer('seller_id', { mode: 'number' }).notNull(),
  created_at: integer('created_at', { mode: 'timestamp' }).notNull().default(sql`(unixepoch())`),

  // The actual payment
  payment_intent_id: text('payment_intent_id', { mode: "text", length: 255 }).notNull(),
  // mapping - seller_id -> transfer_id
  transfers: text('transfers', { mode: "json" }).notNull(),
  // https://docs.stripe.com/connect/separate-charges-and-transfers?platform=web&ui=stripe-hosted&lang=node#handle-post-payment-events
  status: text('status', { enum: ["pending", "completed", "succeeded", "failed"] }).notNull(),
}, (self) => ({
  primaryKey: primaryKey({ columns: [self.supplier_id, self.seller_id, self.created_at] }),
}));

// Can this be a json field? Can deposits be a json field?
export const deposits_transactions_books = sqliteTable("deposits_transactions_books", {
  supplier_id: integer('supplier_id', { mode: 'number' }).notNull(),
  supplier_deposit_id: integer('supplier_deposit_id', { mode: 'number' }),
  seller_id: integer('seller_id', { mode: 'number' }).notNull(),
  seller_deposit_id: integer('seller_deposit_id', { mode: 'number' }),
  created_at: integer('created_at', { mode: 'timestamp' }).notNull(),
  book_id: integer('book_id', { mode: 'number' }).notNull(),
  quantity: integer('quantity', { mode: 'number' }).notNull(),

  paymentStatus: text('paymentStatus', { enum: ['pending', 'paid'] }).notNull().default('pending'),
  status: text('status', { enum: ['transit', 'usable', 'closed (allsold | reso)'] }).notNull().default('transit'),
}, (self) => ({
  primaryKey: primaryKey({ columns: [self.supplier_id, self.seller_id, self.created_at, self.book_id, self.supplier_deposit_id, self.seller_deposit_id] }),
  depositTransactionReference: foreignKey({
    columns: [self.supplier_id, self.seller_id, self.created_at],
    foreignColumns: [deposits_transactions.supplier_id, deposits_transactions.seller_id, deposits_transactions.created_at],
  }),
  bookReference: foreignKey({
    columns: [self.book_id],
    foreignColumns: [books.id],
  }),
  // TODO: Move this on deposit transctions?
  sellerIndex: index("name").on(self.seller_id, self.seller_deposit_id,
    // Indexable by status
    self.status, self.created_at)
  // TODO: Make a partial index? Partial index vs multiple indexes?
  // .where(sql`${table.name} IS NOT NULL`),
  ,
  // TODO:  
  NonPaid: index("NonPaid").on(self.seller_id).where(sql`${self.paymentStatus} = 'pending' AND dueDate < ${new Date()}`),
  // 
}));
