'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { FC } from 'react';
import {
  IconMessage,
  IconMessageFilled,
  IconSettings,
  IconSettingsFilled,
  type Icon,
  IconLayoutDashboard,
  IconLayoutDashboardFilled,
} from '@icons';
import { cn } from '@/lib/utils';
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
  TooltipProvider,
} from '@/components/ui/tooltip';
import { DropdownProfile } from '@/components/shared/dropdown-profile';

interface NavItem {
  label: string;
  icon: Icon;
  activeIcon: Icon;
  href: string;
  count?: number;
}

interface AppSidebarProps {
  unreadCount: number;
  email: string;
  businessName: string;
}

export const AppSidebar: FC<AppSidebarProps> = ({
  unreadCount,
  email,
  businessName,
}) => {
  const initials = businessName.slice(0, 2).toUpperCase();
  const NAV_ITEMS: NavItem[] = [
    {
      label: 'All messages',
      icon: IconMessage,
      activeIcon: IconMessageFilled,
      href: '/inbox',
      count: unreadCount,
    },
    {
      label: 'Analytics',
      icon: IconLayoutDashboard,
      activeIcon: IconLayoutDashboardFilled,
      href: '/analytics',
    },
  ];
  const pathname = usePathname();
  const isSettingsActive = pathname.startsWith('/settings');

  return (
    <TooltipProvider delayDuration={300}>
      <aside className="w-[52px] flex-shrink-0 bg-primary-50 border-r border-primary-100 flex flex-col ">
        {/* Logo */}
        <div className="h-[52px] flex items-center justify-center flex-shrink-0 gap-2">
          <div className="flex items-center gap-2 min-w-0 overflow-hidden">
            <div className="w-6 h-6 border bg-primary rounded-md flex items-center justify-center flex-shrink-0">
              <span className="text-white text-xs font-bold">V</span>
            </div>
          </div>
        </div>

        {/* Main nav */}
        <nav className="flex-1 py-2 overflow-hidden">
          {NAV_ITEMS.map((item) => {
            const isActive = pathname.startsWith(item.href);
            const MenuIcon = isActive ? item.activeIcon : item.icon;
            return (
              <div
                key={item.href}
                className={cn(
                  'mb-0.5',
                  isActive ? 'border-l-3 border-primary' : '',
                )}
              >
                <Tooltip>
                  <TooltipTrigger asChild>
                    <Link
                      href={item.href}
                      className={cn(
                        'flex items-center rounded-lg transition-colors justify-center h-8 w-8 mx-auto',
                        isActive
                          ? 'bg-transparent text-primary font-bold'
                          : 'text-gray-700 hover:bg-primary-100 hover:text-primary',
                      )}
                    >
                      <span className="flex items-center">
                        <span className="relative">
                          <MenuIcon size={20} className="flex-shrink-0" />
                          {/* {item.count !== undefined && (
                            <span className="absolute -top-1 -right-1 w-2 h-2 rounded-full bg-primary" />
                          )} */}
                        </span>
                      </span>
                    </Link>
                  </TooltipTrigger>
                  <TooltipContent side="right" className="text-xs">
                    {item.label}
                  </TooltipContent>
                </Tooltip>
              </div>
            );
          })}
        </nav>

        {/* Footer: Settings */}
        <div className=" border-zinc-100 p-1.5">
          <Tooltip>
            <TooltipTrigger asChild>
              <Link
                href="/settings"
                className={cn(
                  'flex items-center justify-center h-8 w-8 mx-auto rounded-lg transition-colors',
                  isSettingsActive
                    ? 'bg-transparent text-primary'
                    : 'text-gray-700 hover:bg-primary-100 hover:text-primary',
                )}
              >
                {isSettingsActive ? (
                  <IconSettingsFilled size={20} className="flex-shrink-0" />
                ) : (
                  <IconSettings size={20} className="flex-shrink-0" />
                )}
              </Link>
            </TooltipTrigger>
            <TooltipContent side="right" className="text-xs">
              Settings
            </TooltipContent>
          </Tooltip>
        </div>

        {/* User row */}
        <div className=" border-zinc-100 p-1.5">
          <DropdownProfile
            businessName={businessName}
            email={email}
            initials={initials}
          />
        </div>
      </aside>
    </TooltipProvider>
  );
};
