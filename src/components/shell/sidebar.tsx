'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import {
  Settings,
  LogOut,
  Shield,
  Wallet,
  Target,
  Image,
  PenLine,
  BarChart3,
  Briefcase,
  LayoutDashboard,
  X,
  PanelRightClose,
  PanelRightOpen,
  type LucideIcon,
} from 'lucide-react';
import { TOOLS } from '@/lib/tools';
import { useAuth } from '@/hooks/use-auth';
import { useSidebarStore } from '@/stores/sidebar';
import { useLastRouteStore } from '@/stores/last-route';

const iconMap: Record<string, LucideIcon> = {
  Shield,
  Wallet,
  Target,
  Image,
  PenLine,
  BarChart3,
  Briefcase,
  LayoutDashboard,
};

const SidebarContent = ({
  collapsed = false,
  onNavClick,
  showCollapseButton = false,
  onToggleCollapse,
}: {
  collapsed?: boolean;
  onNavClick?: () => void;
  showCollapseButton?: boolean;
  onToggleCollapse?: () => void;
}) => {
  const pathname = usePathname();
  const { user, logout, hasToolAccess } = useAuth();
  const getLastRoute = useLastRouteStore((s) => s.getLastRoute);

  const accessibleTools = TOOLS.filter((tool) => hasToolAccess(tool.slug));
  const firstLetter = user?.name?.charAt(0) || '?';

  return (
    <>
      {/* Logo */}
      <div className={`p-5 pb-4 overflow-hidden ${collapsed ? 'flex justify-center px-2' : ''}`}>
        {collapsed ? (
          <div
            className="w-8 h-8 rounded-lg flex items-center justify-center text-sm font-bold"
            style={{ background: '#FFDF4F', color: '#1a1a1a' }}
          >
            B
          </div>
        ) : (
          <>
            <h1 className="text-lg font-semibold whitespace-nowrap">
              <span style={{ color: '#1a1a1a' }}>Bright</span>
              <span style={{ color: '#D4A017' }}>Suite</span>
            </h1>
            <p
              className="text-xs mt-0.5 whitespace-nowrap"
              style={{ color: 'var(--text-tertiary)' }}
            >
              כלים לסוכנות
            </p>
          </>
        )}
      </div>

      {/* Divider */}
      <div
        className="mx-3"
        style={{ borderBottom: '1px solid var(--glass-border)', opacity: 0.5 }}
      />

      {/* Navigation */}
      <nav className="flex-1 p-2 flex flex-col gap-0.5 overflow-y-auto overflow-x-hidden">
        {accessibleTools.map((tool) => {
          const Icon = iconMap[tool.icon] || Shield;
          const isActive = pathname === tool.href || pathname.startsWith(tool.href + '/');
          const smartHref = getLastRoute(tool.href) || tool.href;

          return (
            <Link
              key={tool.slug}
              href={smartHref}
              onClick={onNavClick}
              title={collapsed ? tool.name : undefined}
              className={`flex items-center gap-3 py-2.5 rounded-xl transition-all duration-200 ${
                collapsed ? 'justify-center px-2' : 'px-3'
              }`}
              style={{
                background: isActive ? 'var(--accent-subtle)' : undefined,
                color: isActive ? 'var(--accent-fg)' : 'var(--text-secondary)',
                borderInlineStart: isActive
                  ? '3px solid var(--accent)'
                  : '3px solid transparent',
              }}
            >
              <Icon size={18} className="shrink-0" />
              {!collapsed && (
                <span className="text-sm font-medium whitespace-nowrap">{tool.name}</span>
              )}
            </Link>
          );
        })}
      </nav>

      {/* Divider */}
      <div
        className="mx-3"
        style={{ borderBottom: '1px solid var(--glass-border)', opacity: 0.5 }}
      />

      {/* Bottom section */}
      <div className="p-2 flex flex-col gap-1">
        <Link
          href="/settings"
          onClick={onNavClick}
          title={collapsed ? 'הגדרות' : undefined}
          className={`flex items-center gap-3 py-2.5 rounded-xl transition-all duration-200 ${
            collapsed ? 'justify-center px-2' : 'px-3'
          }`}
          style={{
            background: pathname.startsWith('/settings') ? 'var(--accent-subtle)' : undefined,
            color: pathname.startsWith('/settings') ? 'var(--accent-fg)' : 'var(--text-secondary)',
          }}
        >
          <Settings size={18} className="shrink-0" />
          {!collapsed && <span className="text-sm font-medium whitespace-nowrap">הגדרות</span>}
        </Link>

        {user && (
          <div className={`flex items-center gap-3 py-2 ${collapsed ? 'justify-center px-1' : 'px-3'}`}>
            {user.avatarUrl ? (
              <img
                src={user.avatarUrl}
                alt={user.name}
                referrerPolicy="no-referrer"
                className="w-8 h-8 rounded-full shrink-0 object-cover"
              />
            ) : (
              <div
                className="w-8 h-8 rounded-full flex items-center justify-center text-xs font-semibold text-white shrink-0"
                style={{ background: 'var(--accent)' }}
              >
                {firstLetter}
              </div>
            )}
            {!collapsed && (
              <>
                <div className="flex-1 min-w-0">
                  <p
                    className="text-sm font-medium truncate"
                    style={{ color: 'var(--text-primary)' }}
                  >
                    {user.name}
                  </p>
                  <span
                    className="text-xs px-1.5 py-0.5 rounded"
                    style={{
                      color: 'var(--accent-fg)',
                      background: 'var(--accent-subtle)',
                    }}
                  >
                    {user.role === 'admin' ? 'אדמין' : 'משתמש'}
                  </span>
                </div>
                <button
                  onClick={logout}
                  className="btn-icon shrink-0"
                  title="התנתק"
                >
                  <LogOut size={18} />
                </button>
              </>
            )}
          </div>
        )}

        {/* Collapse toggle — prominent, at the bottom */}
        {showCollapseButton && onToggleCollapse && (
          <>
            <div
              className="mx-1 mt-1"
              style={{ borderBottom: '1px solid var(--glass-border)', opacity: 0.5 }}
            />
            <button
              onClick={onToggleCollapse}
              title={collapsed ? 'הרחב תפריט' : 'כווץ תפריט'}
              className={`flex items-center gap-3 py-2.5 rounded-xl transition-all duration-200 ${
                collapsed ? 'justify-center px-2' : 'px-3'
              }`}
              style={{ color: 'var(--text-tertiary)' }}
              onMouseEnter={(e) => { e.currentTarget.style.color = 'var(--accent)'; e.currentTarget.style.background = 'var(--accent-subtle)'; }}
              onMouseLeave={(e) => { e.currentTarget.style.color = 'var(--text-tertiary)'; e.currentTarget.style.background = 'transparent'; }}
            >
              {collapsed ? <PanelRightClose size={18} /> : <PanelRightOpen size={18} />}
              {!collapsed && <span className="text-sm font-medium whitespace-nowrap">כווץ תפריט</span>}
            </button>
          </>
        )}
      </div>
    </>
  );
};

export const Sidebar = () => {
  const { isOpen, close, isCollapsed, toggleCollapse } = useSidebarStore();

  return (
    <>
      {/* Desktop sidebar — full height */}
      <aside
        className="hidden md:flex glass-panel shrink-0 flex-col h-screen sticky top-0 overflow-hidden transition-all duration-300 ease-in-out"
        style={{ width: isCollapsed ? '64px' : '256px' }}
      >
        <SidebarContent
          collapsed={isCollapsed}
          showCollapseButton
          onToggleCollapse={toggleCollapse}
        />
      </aside>

      {/* Mobile backdrop */}
      <div
        className={`fixed inset-0 z-40 md:hidden transition-opacity duration-300 ${
          isOpen ? 'opacity-100 pointer-events-auto' : 'opacity-0 pointer-events-none'
        }`}
        style={{ background: 'rgba(0,0,0,0.4)' }}
        onClick={close}
      />

      {/* Mobile drawer (from right — RTL) */}
      <aside
        className={`fixed inset-y-0 right-0 w-72 z-50 md:hidden flex flex-col overflow-hidden transition-transform duration-300 ease-out ${
          isOpen ? 'translate-x-0' : 'translate-x-full'
        }`}
        style={{
          background: 'var(--glass-bg)',
          backdropFilter: 'blur(24px)',
          WebkitBackdropFilter: 'blur(24px)',
          borderInlineStart: '1px solid var(--glass-border)',
        }}
      >
        <div className="flex justify-start p-3">
          <button
            onClick={close}
            className="btn-icon"
            title="סגור תפריט"
          >
            <X size={20} />
          </button>
        </div>
        <SidebarContent onNavClick={close} />
      </aside>
    </>
  );
};
