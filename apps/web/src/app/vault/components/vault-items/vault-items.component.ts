import { SelectionModel } from "@angular/cdk/collections";
import { Component, EventEmitter, Input, Output } from "@angular/core";

import { Organization } from "@bitwarden/common/admin-console/models/domain/organization";
import { CipherView } from "@bitwarden/common/vault/models/view/cipher.view";
import { CollectionView } from "@bitwarden/common/vault/models/view/collection.view";
import { TableDataSource } from "@bitwarden/components";

import { GroupView } from "../../../admin-console/organizations/core";
import { CollectionAdminView } from "../../core/views/collection-admin.view";
import { Unassigned } from "../../individual-vault/vault-filter/shared/models/routed-vault-filter.model";

import { VaultItem } from "./vault-item";
import { VaultItemEvent } from "./vault-item-event";

// Fixed manual row height required due to how cdk-virtual-scroll works
export const RowHeight = 65;
export const RowHeightClass = `tw-h-[65px]`;

const MaxSelectionCount = 500;

@Component({
  selector: "app-vault-items",
  templateUrl: "vault-items.component.html",
  // TODO: Improve change detection, see: https://bitwarden.atlassian.net/browse/TDL-220
  // changeDetection: ChangeDetectionStrategy.OnPush,
})
export class VaultItemsComponent {
  protected RowHeight = RowHeight;

  @Input() disabled: boolean;
  @Input() showOwner: boolean;
  @Input() showCollections: boolean;
  @Input() showGroups: boolean;
  @Input() useEvents: boolean;
  @Input() editableCollections: boolean;
  @Input() cloneableOrganizationCiphers: boolean;
  @Input() showPremiumFeatures: boolean;
  @Input() showBulkMove: boolean;
  @Input() showBulkTrashOptions: boolean;
  @Input() allOrganizations: Organization[] = [];
  @Input() allCollections: CollectionView[] = [];
  @Input() allGroups: GroupView[] = [];

  private _ciphers?: CipherView[] = [];
  @Input() get ciphers(): CipherView[] {
    return this._ciphers;
  }
  set ciphers(value: CipherView[] | undefined) {
    this._ciphers = value ?? [];
    this.refreshItems();
  }

  private _collections?: CollectionView[] = [];
  @Input() get collections(): CollectionView[] {
    return this._collections;
  }
  set collections(value: CollectionView[] | undefined) {
    this._collections = value ?? [];
    this.refreshItems();
  }

  @Output() onEvent = new EventEmitter<VaultItemEvent>();

  protected editableItems: VaultItem[] = [];
  protected dataSource = new TableDataSource<VaultItem>();
  protected selection = new SelectionModel<VaultItem>(true, [], true);

  get showExtraColumn() {
    return this.showCollections || this.showGroups || this.showOwner;
  }

  get isAllSelected() {
    return this.editableItems
      .slice(0, MaxSelectionCount)
      .every((item) => this.selection.isSelected(item));
  }

  get isEmpty() {
    return this.dataSource.data.length === 0;
  }

  protected canEditCollection(collection: CollectionView): boolean {
    // We currently don't support editing collections from individual vault
    if (!(collection instanceof CollectionAdminView)) {
      return false;
    }

    // Only allow allow deletion if collection editing is enabled and not deleting "Unassigned"
    if (!this.editableCollections || collection.id === Unassigned) {
      return false;
    }

    const organization = this.allOrganizations.find((o) => o.id === collection.organizationId);

    // Otherwise, check if we can edit the specified collection
    return (
      organization?.canEditAnyCollection ||
      (organization?.canEditAssignedCollections && collection.assigned)
    );
  }

  protected canDeleteCollection(collection: CollectionView): boolean {
    // We currently don't support editing collections from individual vault
    if (!(collection instanceof CollectionAdminView)) {
      return false;
    }

    // Only allow allow deletion if collection editing is enabled and not deleting "Unassigned"
    if (!this.editableCollections || collection.id === Unassigned) {
      return false;
    }

    const organization = this.allOrganizations.find((o) => o.id === collection.organizationId);

    // Otherwise, check if we can delete the specified collection
    return (
      organization?.canDeleteAnyCollection ||
      (organization?.canDeleteAssignedCollections && collection.assigned)
    );
  }

  protected toggleAll() {
    this.isAllSelected
      ? this.selection.clear()
      : this.selection.select(...this.editableItems.slice(0, MaxSelectionCount));
  }

  protected event(event: VaultItemEvent) {
    this.onEvent.emit(event);
  }

  protected bulkMoveToFolder() {
    this.event({
      type: "moveToFolder",
      items: this.selection.selected
        .filter((item) => item.cipher !== undefined)
        .map((item) => item.cipher),
    });
  }

  protected bulkMoveToOrganization() {
    this.event({
      type: "moveToOrganization",
      items: this.selection.selected
        .filter((item) => item.cipher !== undefined)
        .map((item) => item.cipher),
    });
  }

  protected bulkRestore() {
    this.event({
      type: "restore",
      items: this.selection.selected
        .filter((item) => item.cipher !== undefined)
        .map((item) => item.cipher),
    });
  }

  protected bulkDelete() {
    this.event({
      type: "delete",
      items: this.selection.selected,
    });
  }

  private refreshItems() {
    const collections: VaultItem[] = this.collections.map((collection) => ({ collection }));
    const ciphers: VaultItem[] = this.ciphers.map((cipher) => ({ cipher }));
    const items: VaultItem[] = [].concat(collections).concat(ciphers);

    this.selection.clear();
    this.editableItems = items.filter(
      (item) =>
        item.cipher !== undefined ||
        (item.collection !== undefined && this.canDeleteCollection(item.collection))
    );
    this.dataSource.data = items;
  }
}
