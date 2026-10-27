import { fireEvent, render, screen } from '@testing-library/react';
import { describe, expect, it } from 'vitest';
import { ChatImageGrid, ChatImageViewer } from './ChatImages';

describe('chat image display', () => {
  it('keeps multi-image thumbnails readable without cropping their source ratio', () => {
    render(<ChatImageGrid images={['tall.png', 'wide.png']} onOpen={() => {}} />);

    const images = screen.getAllByRole('img');
    expect(images).toHaveLength(2);
    for (const image of images) {
      expect(image).toHaveClass('w-full', 'h-auto');
      expect(image).toHaveStyle({ maxHeight: '15rem', objectFit: 'contain' });
    }
  });

  it('renders the full-screen viewer outside the clipped chat and fits it to the viewport', () => {
    const chat = document.createElement('div');
    chat.style.overflow = 'hidden';
    document.body.append(chat);

    render(<ChatImageViewer images={['photo.png']} index={0} onClose={() => {}} onIndexChange={() => {}} />, { container: chat });

    const dialog = screen.getByRole('dialog', { name: 'Image preview' });
    const image = screen.getByRole('img', { name: 'Image 1 of 1' });
    expect(dialog.parentElement).toBe(document.body);
    expect(image).toHaveStyle({ maxWidth: 'calc(100vw - 5rem)', maxHeight: 'calc(100dvh - 5rem)', objectFit: 'contain' });

    fireEvent.click(screen.getByRole('button', { name: 'Close image preview' }));
    chat.remove();
  });
});
