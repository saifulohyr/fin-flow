import { pgTable, text, integer, timestamp, pgEnum } from "drizzle-orm/pg-core";
import { relations } from "drizzle-orm";

export const accountTypeEnum = pgEnum("account_type", ["bank", "ewallet", "cash", "investment"]);
export const transactionTypeEnum = pgEnum("transaction_type", ["income", "expense", "transfer"]);
export const budgetPeriodEnum = pgEnum("budget_period", ["monthly", "weekly", "yearly"]);

export const accounts = pgTable("accounts", {
  id: text("id").primaryKey(),
  name: text("name").notNull(),
  type: accountTypeEnum("type").notNull().default("bank"),
  balance: integer("balance").notNull().default(0),
  accountNumber: text("account_number"),
  color: text("color").notNull().default("#047857"),
  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at").defaultNow().notNull(),
});

export const categories = pgTable("categories", {
  id: text("id").primaryKey(),
  name: text("name").notNull(),
  type: transactionTypeEnum("type").notNull().default("expense"),
  icon: text("icon").notNull().default("tag"),
  color: text("color").notNull().default("#78716c"),
});

export const transactions = pgTable("transactions", {
  id: text("id").primaryKey(),
  amount: integer("amount").notNull(),
  type: transactionTypeEnum("type").notNull(),
  accountId: text("account_id").references(() => accounts.id, { onDelete: "cascade" }).notNull(),
  toAccountId: text("to_account_id").references(() => accounts.id, { onDelete: "set null" }),
  categoryId: text("category_id").references(() => categories.id, { onDelete: "restrict" }).notNull(),
  note: text("note"),
  date: text("date").notNull(),
  createdAt: timestamp("created_at").defaultNow().notNull(),
});

export const budgets = pgTable("budgets", {
  id: text("id").primaryKey(),
  categoryId: text("category_id").references(() => categories.id, { onDelete: "cascade" }).notNull(),
  amount: integer("amount").notNull(),
  period: budgetPeriodEnum("period").notNull().default("monthly"),
  startDate: text("start_date").notNull(),
  endDate: text("end_date"),
  createdAt: timestamp("created_at").defaultNow().notNull(),
});

export const accountsRelations = relations(accounts, ({ many }) => ({
  transactions: many(transactions, { relationName: "accountTransactions" }),
}));

export const categoriesRelations = relations(categories, ({ many }) => ({
  transactions: many(transactions),
  budgets: many(budgets),
}));

export const transactionsRelations = relations(transactions, ({ one }) => ({
  account: one(accounts, {
    fields: [transactions.accountId],
    references: [accounts.id],
    relationName: "accountTransactions",
  }),
  toAccount: one(accounts, {
    fields: [transactions.toAccountId],
    references: [accounts.id],
    relationName: "toAccountTransactions",
  }),
  category: one(categories, {
    fields: [transactions.categoryId],
    references: [categories.id],
  }),
}));

export const budgetsRelations = relations(budgets, ({ one }) => ({
  category: one(categories, {
    fields: [budgets.categoryId],
    references: [categories.id],
  }),
}));
