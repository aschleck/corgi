import * as corgi from '../corgi';

export function IndeterminantCircular({fill}: {fill?: `before:border-${string}`}) {
  return (
    <div
        className={
          `
            h-8
            relative
            text-3xl
            w-8
            before:absolute
            before:animate-spin
            before:border-[0.1em]
            ${fill ?? 'before:border-white-opaque-250'}
            before:border-b-transparent
            before:content-['']
            before:h-[1em]
            before:rounded-full
            before:w-[1em]
        `
      }
    >
    </div>
  );
}

export function IndeterminantLinear({fill}: {fill?: `before:bg-${string}`}) {
  return (
    <div
      className={
          `
            absolute
            h-1
            left-0
            right-0
            select-none
            top-0
            touch-none
            before:animate-slide
            ${fill ?? 'before:bg-gray-900'}
            before:bottom-0
            before:content-['']
            before:left-0
            before:absolute
            before:top-0
            before:w-1/3
        `
      }
    >
    </div>
  );
}

