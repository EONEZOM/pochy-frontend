import * as React from 'react';
import { cva, type VariantProps } from 'class-variance-authority';
import { cn } from '@/lib/utils';

const ButtonVariants = cva(
  [
    'inline-flex shrink-0 items-center justify-center rounded-full border font-bold',
    'transition-[color,background-color,border-color,box-shadow,transform]',
    'shadow-[0_2px_8px_rgba(22,22,24,0.08)]',
    'focus-visible:ring-brand-classic/35 outline-none focus-visible:ring-2 focus-visible:ring-offset-2 focus-visible:ring-offset-white',
    'active:translate-y-px',
    'disabled:pointer-events-none',
  ].join(' '),
  {
    variants: {
      variant: {
        /** 흰 배경 + 검정 텍스트·아이콘 */
        default:
          'border-mono-bright-gray bg-white text-mono-jet hover:border-brand-classic/50 hover:text-brand-classic',
        /** 흰 배경 + 핑크 (호버·선택 등 강조) */
        active: 'border-mono-bright-gray bg-white text-brand-classic',
        /** 핑크 배경 + 흰 글자 */
        solid:
          'border-transparent bg-brand-classic text-white hover:bg-brand-classic/90 [&_svg]:text-white',
        /** 연한 회색 ( `disabled`일 때 내부에서만 사용 ) */
        muted:
          'border-mono-bright-gray bg-white text-mono-dark-gray [&_svg]:text-mono-dark-gray',
      },
      size: {
        lg: 'h-12 min-h-12 gap-1.5 px-6 text-base [&_svg:not([class*=size-])]:size-5',
        md: 'h-10 min-h-10 gap-1.5 px-5 text-sm [&_svg:not([class*=size-])]:size-4',
        sm: 'h-8 min-h-8 gap-1 px-4 text-xs [&_svg:not([class*=size-])]:size-3.5',
      },
    },
    defaultVariants: {
      variant: 'default',
      size: 'md',
    },
  },
);

export type ButtonVariant = NonNullable<
  VariantProps<typeof ButtonVariants>['variant']
>;

export type ButtonProps = Omit<React.ComponentProps<'button'>, 'className'> & {
  className?: string;
  variant?: Exclude<ButtonVariant, 'muted'>;
  size?: VariantProps<typeof ButtonVariants>['size'];
  iconPosition?: 'left' | 'right';
  icon?: React.ReactNode;
};

const Button = React.forwardRef<HTMLButtonElement, ButtonProps>(
  (
    {
      className,
      variant: variantProp = 'default',
      size = 'md',
      disabled,
      icon,
      iconPosition = 'left',
      children,
      type = 'button',
      ...props
    },
    ref,
  ) => {
    const variant = disabled ? 'muted' : variantProp;

    return (
      <button
        ref={ref}
        type={type}
        disabled={disabled}
        className={cn(ButtonVariants({ variant, size }), className)}
        data-variant={variant}
        data-size={size}
        {...props}
      >
        {icon && iconPosition === 'left' && (
          <span
            className="inline-flex shrink-0 items-center justify-center"
            aria-hidden
          >
            {icon}
          </span>
        )}
        {children != null && children !== false && (
          <span className="min-w-0 truncate leading-none">{children}</span>
        )}
        {icon && iconPosition === 'right' && (
          <span
            className="inline-flex shrink-0 items-center justify-center"
            aria-hidden
          >
            {icon}
          </span>
        )}
      </button>
    );
  },
);
Button.displayName = 'Button';

export { Button, ButtonVariants };
