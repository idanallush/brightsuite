import { sqliteTable, text, integer } from 'drizzle-orm/sqlite-core';

export const bsUsers = sqliteTable('bs_users', {
  id: integer('id').primaryKey({ autoIncrement: true }),
  email: text('email').notNull().unique(),
  name: text('name').notNull(),
  password_hash: text('password_hash').notNull(),
  role: text('role', { enum: ['admin', 'manager', 'viewer'] }).notNull().default('viewer'),
  avatar_url: text('avatar_url'),
  is_active: integer('is_active').default(1),
  created_at: text('created_at').default('CURRENT_TIMESTAMP'),
  updated_at: text('updated_at').default('CURRENT_TIMESTAMP'),
});

export const bsToolPermissions = sqliteTable('bs_tool_permissions', {
  id: integer('id').primaryKey({ autoIncrement: true }),
  user_id: integer('user_id')
    .notNull()
    .references(() => bsUsers.id, { onDelete: 'cascade' }),
  tool_slug: text('tool_slug').notNull(),
  granted_by: integer('granted_by').references(() => bsUsers.id),
  created_at: text('created_at').default('CURRENT_TIMESTAMP'),
});

export const bsAuditLog = sqliteTable('bs_audit_log', {
  id: integer('id').primaryKey({ autoIncrement: true }),
  user_id: integer('user_id').references(() => bsUsers.id, { onDelete: 'set null' }),
  user_email: text('user_email'),
  user_name: text('user_name'),
  tool_slug: text('tool_slug'),
  action: text('action').notNull(),
  entity_type: text('entity_type'),
  entity_id: text('entity_id'),
  details: text('details'),
  created_at: text('created_at').default('CURRENT_TIMESTAMP'),
});

export const bsFbConnections = sqliteTable('bs_fb_connections', {
  id: integer('id').primaryKey({ autoIncrement: true }),
  created_by: integer('created_by').references(() => bsUsers.id),
  fb_user_id: text('fb_user_id').notNull(),
  fb_user_name: text('fb_user_name'),
  access_token: text('access_token').notNull(),
  token_expires_at: text('token_expires_at'),
  is_active: integer('is_active').default(1),
  created_at: text('created_at').default('CURRENT_TIMESTAMP'),
  updated_at: text('updated_at').default('CURRENT_TIMESTAMP'),
});
