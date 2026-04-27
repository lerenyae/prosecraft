import { forwardRef } from 'react';
import Link from 'next/link';
import { cn } from '@/lib/cn';

export type ButtonVariant = 'primary' | 'secondary' | 'ghost';

const variantClasses: Record<ButtonVariant, string> = {
  primary:
    'bg-bark text-cream rounded-lg py-3.5 px-7 font-medium text-[15px] hover:opacity-95 transition-opacity',
  secondary:
    'bg-cream text-bark border border-edge rounded-lg py-3.5 px-7 font-medium text-[15px] hover:bg-cream-2 transition-colors',
  ghost:
    'text-bark text-sm border-b border-muted pb-0.5 hover:opacity-80 transition-opacity bg-transparent',
};

type ButtonOwnProps = {
  variant?: ButtonVariant;
  className?: string;
  children: React.ReactNode;
};

type ButtonAsButtonProps = ButtonOwnProps &
  Omit<React.ButtonHTMLAttributes<HTMLButtonElement>, keyof ButtonOwnProps> & {
    href?: never;
  };

type ButtonAsLinkProps = ButtonOwnProps & {
  href: string;
} & Omit<React.AnchorHTMLAttributes<HTMLAnchorElement>, 'href' | keyof ButtonOwnProps>;

export type ButtonProps = ButtonAsButtonProps | ButtonAsLinkProps;

export const Button = forwardRef<HTMLElement, ButtonProps>(function Button(
  { variant = 'primary', className, children, ...rest },
  ref
) {
  const classes = cn('inline-flex items-center justify-center', variantClasses[variant], className);

  if ('href' in rest && rest.href !== undefined) {
    const { href, ...anchorRest } = rest;
    return (
      <Link
        ref={ref as React.Ref<HTMLAnchorElement>}
        href={href}
        className={classes}
        {...anchorRest}
      >
        {children}
      </Link>
    );
  }

  return (
    <button
      ref={ref as React.Ref<HTMLButtonElement>}
      className={classes}
      {...(rest as React.ButtonHTMLAttributes<HTMLButtonElement>)}
    >
      {children}
    </button>
  );
});
