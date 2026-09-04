import { ChangeDetectionStrategy, Component, input, output, signal } from '@angular/core';
import { UiButton } from '../../../shared/ui/button/button.component';
import { JourneySequenceItem } from '../rules/journey-sequence';

@Component({
  selector: 'app-journey-sequence-panel',
  imports: [UiButton],
  changeDetection: ChangeDetectionStrategy.OnPush,
  templateUrl: './journey-sequence-panel.component.html',
  styleUrl: './journey-sequence-panel.component.scss',
})
export class JourneySequencePanel {
  readonly groupName = input('');
  readonly helperText = input('');
  readonly hasGroup = input(false);
  readonly items = input<readonly JourneySequenceItem[]>([]);
  readonly currentIndex = input(0);
  readonly canMoveUp = input(false);
  readonly canMoveDown = input(false);

  readonly moveToIndex = output<number>();

  protected readonly dropIndex = signal<number | null>(null);
  protected readonly dragging = signal(false);

  protected onDragStart(event: DragEvent, index: number): void {
    const item = this.items()[index];
    if (!item?.isCurrent) {
      event.preventDefault();
      return;
    }

    this.dragging.set(true);
    this.dropIndex.set(index);
    event.dataTransfer?.setData('text/plain', String(index));
    if (event.dataTransfer) {
      event.dataTransfer.effectAllowed = 'move';
    }
  }

  protected onDragOver(event: DragEvent, index: number): void {
    if (!this.dragging()) {
      return;
    }
    event.preventDefault();
    if (event.dataTransfer) {
      event.dataTransfer.dropEffect = 'move';
    }
    this.dropIndex.set(index);
  }

  protected onDrop(event: DragEvent, index: number): void {
    event.preventDefault();
    this.moveToIndex.emit(index);
    this.resetDrag();
  }

  protected onDragEnd(): void {
    this.resetDrag();
  }

  protected moveUp(): void {
    if (!this.canMoveUp()) {
      return;
    }
    this.moveToIndex.emit(this.currentIndex() - 1);
  }

  protected moveDown(): void {
    if (!this.canMoveDown()) {
      return;
    }
    this.moveToIndex.emit(this.currentIndex() + 1);
  }

  protected positionAnnouncement(): string {
    const items = this.items();
    if (!this.hasGroup() || items.length === 0) {
      return '';
    }
    return `This rule is position ${this.currentIndex() + 1} of ${items.length} in ${this.groupName()}.`;
  }

  private resetDrag(): void {
    this.dragging.set(false);
    this.dropIndex.set(null);
  }
}
