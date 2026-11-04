/** @vitest-environment jsdom */
import { act, fireEvent, render, screen } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { LONG_PRESS_MS, useLongPress } from './useLongPress';

function Harness({ onLongPress, onClick }: { onLongPress: () => void; onClick: () => void }) {
  const longPress = useLongPress(onLongPress);
  return (
    <a
      href="#x"
      {...longPress}
      onClick={(event) => {
        longPress.onClick(event);
        if (!event.defaultPrevented) onClick();
      }}
    >
      Séance
    </a>
  );
}

function setup() {
  const onLongPress = vi.fn();
  const onClick = vi.fn();
  render(<Harness onLongPress={onLongPress} onClick={onClick} />);
  return { onLongPress, onClick, link: screen.getByRole('link', { name: 'Séance' }) };
}

describe('useLongPress', () => {
  beforeEach(() => vi.useFakeTimers());
  afterEach(() => vi.useRealTimers());

  it('fires after holding and swallows the following click', () => {
    const { onLongPress, onClick, link } = setup();
    fireEvent.pointerDown(link, { button: 0, clientX: 0, clientY: 0 });
    act(() => vi.advanceTimersByTime(LONG_PRESS_MS));
    expect(onLongPress).toHaveBeenCalledOnce();
    fireEvent.pointerUp(link);
    fireEvent.click(link);
    expect(onClick).not.toHaveBeenCalled();
  });

  it('keeps a short tap as a normal click', () => {
    const { onLongPress, onClick, link } = setup();
    fireEvent.pointerDown(link, { button: 0, clientX: 0, clientY: 0 });
    act(() => vi.advanceTimersByTime(LONG_PRESS_MS - 100));
    fireEvent.pointerUp(link);
    fireEvent.click(link);
    act(() => vi.advanceTimersByTime(LONG_PRESS_MS));
    expect(onLongPress).not.toHaveBeenCalled();
    expect(onClick).toHaveBeenCalledOnce();
  });

  it('is cancelled by moving (scrolling)', () => {
    const { onLongPress, link } = setup();
    fireEvent.pointerDown(link, { button: 0, clientX: 0, clientY: 0 });
    fireEvent.pointerMove(link, { clientX: 0, clientY: 30 });
    act(() => vi.advanceTimersByTime(LONG_PRESS_MS));
    expect(onLongPress).not.toHaveBeenCalled();
  });

  it('fires once on the context menu, even right after a long press', () => {
    const { onLongPress, link } = setup();
    fireEvent.contextMenu(link);
    expect(onLongPress).toHaveBeenCalledOnce();

    fireEvent.pointerDown(link, { button: 0, clientX: 0, clientY: 0 });
    act(() => vi.advanceTimersByTime(LONG_PRESS_MS));
    fireEvent.contextMenu(link);
    expect(onLongPress).toHaveBeenCalledTimes(2);

    // The release landed elsewhere (no click): a later right-click still works.
    fireEvent.pointerDown(link, { button: 2, clientX: 0, clientY: 0 });
    fireEvent.contextMenu(link);
    expect(onLongPress).toHaveBeenCalledTimes(3);
  });
});
