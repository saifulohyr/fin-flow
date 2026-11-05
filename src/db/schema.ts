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

// ── Debt Tracker ───────────────────────────────────────────────────────────────
export const debtTypeEnum = pgEnum("debt_type", [
  "credit_card",
  "personal_loan",
  "mortgage",
  "vehicle_loan",
  "installment",
  "other",
]);
export const debtStatusEnum = pgEnum("debt_status", ["active", "paid_off", "defaulted"]);

export const debts = pgTable("debts", {
  id: text("id").primaryKey(),
  name: text("name").notNull(),
  type: debtTypeEnum("type").notNull().default("personal_loan"),
  principalAmount: integer("principal_amount").notNull(),
  outstandingBalance: integer("outstanding_balance").notNull().default(0),
  interestRateAnnual: integer("interest_rate_annual_bps").notNull().default(0), // basis points (1200 = 12%)
  monthlyPayment: integer("monthly_payment").notNull(),
  startDate: text("start_date").notNull(),
  dueDate: text("due_date"),
  accountId: text("account_id").references(() => accounts.id, { onDelete: "set null" }),
  status: debtStatusEnum("status").notNull().default("active"),
  color: text("color").notNull().default("#b45309"),
  note: text("note"),
  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at").defaultNow().notNull(),
});

/** Point-in-time net-worth snapshot for historical trend. */
export const netWorthSnapshots = pgTable("net_worth_snapshots", {
  id: text("id").primaryKey(),
  snapshotDate: text("snapshot_date").notNull(), // YYYY-MM-DD
  totalAssets: integer("total_assets").notNull(),
  totalDebt: integer("total_debt").notNull(),
  netWorth: integer("net_worth").notNull(), // assets - debt
  createdAt: timestamp("created_at").defaultNow().notNull(),
});

export const debtsRelations = relations(debts, ({ one }) => ({
  account: one(accounts, {
    fields: [debts.accountId],
    references: [accounts.id],
  }),
}));
