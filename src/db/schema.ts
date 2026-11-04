import { pgTable, text, integer, timestamp, pgEnum, boolean } from "drizzle-orm/pg-core";
import { relations } from "drizzle-orm";

export const accountTypeEnum = pgEnum("account_type", ["bank", "ewallet", "cash", "investment"]);
export const transactionTypeEnum = pgEnum("transaction_type", ["income", "expense", "transfer"]);
export const budgetPeriodEnum = pgEnum("budget_period", ["monthly", "weekly", "yearly"]);
export const recurringFrequencyEnum = pgEnum("recurring_frequency", ["daily", "weekly", "monthly", "yearly"]);
export const goalCategoryEnum = pgEnum("goal_category", [
  "emergency_fund",
  "sinking_fund",
  "investment",
  "purchase",
  "education",
  "other",
]);
export const goalPriorityEnum = pgEnum("goal_priority", ["low", "medium", "high"]);

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

export const recurringTransactions = pgTable("recurring_transactions", {
  id: text("id").primaryKey(),
  title: text("title").notNull(),
  amount: integer("amount").notNull(),
  categoryId: text("category_id").references(() => categories.id, { onDelete: "restrict" }).notNull(),
  accountId: text("account_id").references(() => accounts.id, { onDelete: "cascade" }).notNull(),
  frequency: recurringFrequencyEnum("frequency").notNull().default("monthly"),
  startDate: text("start_date").notNull(),
  nextDueDate: text("next_due_date").notNull(),
  isActive: boolean("is_active").notNull().default(true),
  autoDeduct: boolean("auto_deduct").notNull().default(false),
  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at").defaultNow().notNull(),
});

export const savingsGoals = pgTable("savings_goals", {
  id: text("id").primaryKey(),
  name: text("name").notNull(),
  targetAmount: integer("target_amount").notNull(),
  currentAmount: integer("current_amount").notNull().default(0),
  targetDate: text("target_date").notNull(),
  category: goalCategoryEnum("category").notNull().default("sinking_fund"),
  priority: goalPriorityEnum("priority").notNull().default("medium"),
  accountId: text("account_id").references(() => accounts.id, { onDelete: "set null" }),
  color: text("color").notNull().default("#047857"),
  isCompleted: boolean("is_completed").notNull().default(false),
  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at").defaultNow().notNull(),
});

export const accountsRelations = relations(accounts, ({ many }) => ({
  transactions: many(transactions, { relationName: "accountTransactions" }),
  recurringTransactions: many(recurringTransactions),
  savingsGoals: many(savingsGoals),
}));

export const categoriesRelations = relations(categories, ({ many }) => ({
  transactions: many(transactions),
  budgets: many(budgets),
  recurringTransactions: many(recurringTransactions),
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

export const recurringTransactionsRelations = relations(recurringTransactions, ({ one }) => ({
  account: one(accounts, {
    fields: [recurringTransactions.accountId],
    references: [accounts.id],
  }),
  category: one(categories, {
    fields: [recurringTransactions.categoryId],
    references: [categories.id],
  }),
}));

export const savingsGoalsRelations = relations(savingsGoals, ({ one }) => ({
  account: one(accounts, {
    fields: [savingsGoals.accountId],
    references: [accounts.id],
  }),
}));
