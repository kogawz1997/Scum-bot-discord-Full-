/**
 * Dashboard shop catalog and bundle builder helpers split out of
 * the former dashboard monolith so add-item and catalog flows are easier to review.
 */
    function makeSuggestedItemId(itemId) {
      const text = String(itemId || '')
        .trim()
        .toLowerCase()
        .replace(/[^a-z0-9]+/g, '-')
        .replace(/^-+|-+$/g, '')
        .slice(0, 48);
      if (!text) return '';
      return `item-${text}`;
    }

    function normalizeBundleQty(value) {
      return Math.max(1, Math.trunc(Number(value || 1) || 1));
    }

    function getShopCatalogSourceButton(sourceKey) {
      if (sourceKey === 'manifest') return shopCatalogSourceManifestBtn;
      if (sourceKey === 'weapons') return shopCatalogSourceWeaponsBtn;
      if (sourceKey === 'icons') return shopCatalogSourceIconsBtn;
      return null;
    }

    function updateShopCatalogSourceUi() {
      const sourceKeys = ['manifest', 'weapons', 'icons'];
      sourceKeys.forEach((sourceKey) => {
        const button = getShopCatalogSourceButton(sourceKey);
        if (!button) return;
        button.classList.toggle('active-source', sourceKey === shopCatalogSource);
      });
      if (!shopGameItemSearchInput) return;
      if (shopCatalogSource === 'manifest') {
        shopGameItemSearchInput.placeholder = 'ค้นหาไอเทมจาก Wiki/Manifest เช่น Weapon_M16A4';
        return;
      }
      if (shopCatalogSource === 'weapons') {
        shopGameItemSearchInput.placeholder = 'ค้นหาอาวุธจาก Wiki เช่น AK-47 หรือ Weapon_AK47';
        return;
      }
      shopGameItemSearchInput.placeholder = 'ค้นหาไอเทมจากคลังไอคอนเดิม เช่น Weapon_M16A4';
    }

    function setShopCatalogSource(sourceKey, options = {}) {
      const { reload = true } = options;
      if (!SHOP_CATALOG_ENDPOINTS[sourceKey]) {
        return;
      }
      shopCatalogSource = sourceKey;
      updateShopCatalogSourceUi();
      if (!reload || !isAuthed) return;
      scheduleGameItemCatalogFetch(shopGameItemSearchInput?.value || '');
    }

    function normalizeCatalogItem(item) {
      if (!item || typeof item !== 'object') return null;
      const gameItemId = String(
        item.gameItemId
          || item.spawnId
          || item.id
          || '',
      ).trim();
      if (!gameItemId) return null;
      const name = String(item.name || '').trim();
      const iconUrl = String(item.iconUrl || '').trim();
      const category = String(item.category || '').trim();
      const filename = String(item.filename || '').trim();
      const commandTemplate = String(item.commandTemplate || '').trim();
      const subtitleParts = [];
      if (category) subtitleParts.push(`หมวด: ${category}`);
      if (filename) subtitleParts.push(`ไฟล์: ${filename}`);
      if (commandTemplate) subtitleParts.push(commandTemplate);
      return {
        id: gameItemId,
        name: name || gameItemId,
        iconUrl,
        subText: subtitleParts.join(' | '),
        category,
      };
    }

    function syncShopDeliveryHiddenInputs() {
      if (!shopDeliveryItemsInput || !shopGameItemIdInput || !shopGameItemIconInput) return;
      if (!Array.isArray(shopDeliveryItems) || shopDeliveryItems.length === 0) {
        shopDeliveryItemsInput.value = '';
        shopGameItemIdInput.value = '';
        shopGameItemIconInput.value = '';
        return;
      }

      const compact = shopDeliveryItems.map((entry) => ({
        gameItemId: String(entry.gameItemId || '').trim(),
        quantity: normalizeBundleQty(entry.quantity),
        iconUrl: String(entry.iconUrl || '').trim() || null,
      }));

      shopDeliveryItemsInput.value = JSON.stringify(compact);
      shopGameItemIdInput.value = compact[0].gameItemId;
      shopGameItemIconInput.value = compact[0].iconUrl || '';
    }

    function renderShopDeliveryItems() {
      if (!shopDeliveryItemsList) return;

      if (!Array.isArray(shopDeliveryItems) || shopDeliveryItems.length === 0) {
        shopDeliveryItemsList.innerHTML = '<div class=\"catalog-bundle-empty\">ยังไม่มีไอเทมในรายการสินค้า กดเลือกจากรายการด้านบนเพื่อเพิ่ม</div>';
        syncShopDeliveryHiddenInputs();
        return;
      }

      shopDeliveryItemsList.innerHTML = shopDeliveryItems
        .map((entry, index) => {
          const gameItemId = escapeHtml(String(entry.gameItemId || ''));
          const iconUrl = escapeHtml(String(entry.iconUrl || ''));
          const qty = normalizeBundleQty(entry.quantity);
          return [
            `<div class=\"catalog-bundle-row\" data-bundle-idx=\"${index}\">`,
            `<img src=\"${iconUrl}\" alt=\"${gameItemId}\">`,
            `<div class=\"catalog-bundle-main\" title=\"${gameItemId}\">${gameItemId}</div>`,
            `<label class=\"catalog-bundle-qty\"><input type=\"number\" min=\"1\" step=\"1\" value=\"${qty}\" data-bundle-qty=\"${index}\"></label>`,
            `<button type=\"button\" class=\"catalog-bundle-remove\" data-bundle-remove=\"${index}\" aria-label=\"ลบรายการ\">×</button>`,
            '</div>',
          ].join('');
        })
        .join('');

      const qtyInputs = Array.from(shopDeliveryItemsList.querySelectorAll('input[data-bundle-qty]'));
      qtyInputs.forEach((input) => {
        input.addEventListener('change', () => {
          const idx = Number(input.dataset.bundleQty || -1);
          if (!shopDeliveryItems[idx]) return;
          shopDeliveryItems[idx].quantity = normalizeBundleQty(input.value);
          renderShopDeliveryItems();
        });
      });

      const removeButtons = Array.from(shopDeliveryItemsList.querySelectorAll('button[data-bundle-remove]'));
      removeButtons.forEach((button) => {
        button.addEventListener('click', () => {
          const idx = Number(button.dataset.bundleRemove || -1);
          if (idx < 0 || idx >= shopDeliveryItems.length) return;
          shopDeliveryItems.splice(idx, 1);
          renderShopDeliveryItems();
        });
      });

      syncShopDeliveryHiddenInputs();
    }

    function addDeliveryItemToBundle(item, quantity) {
      const gameItemId = String(item?.id || item?.gameItemId || '').trim();
      if (!gameItemId) return;
      const iconUrl = String(item?.iconUrl || '').trim() || null;
      const qty = normalizeBundleQty(quantity);
      const existing = shopDeliveryItems.find(
        (entry) => String(entry.gameItemId || '').toLowerCase() === gameItemId.toLowerCase(),
      );
      if (existing) {
        existing.quantity = normalizeBundleQty(Number(existing.quantity || 1) + qty);
        if (!existing.iconUrl && iconUrl) {
          existing.iconUrl = iconUrl;
        }
      } else {
        shopDeliveryItems.push({ gameItemId, quantity: qty, iconUrl });
      }

      if (!String(shopAddNameInput.value || '').trim()) {
        shopAddNameInput.value = `${gameItemId} x${qty}`;
      }
      if (!String(shopAddIdInput.value || '').trim()) {
        const suggested = makeSuggestedItemId(gameItemId);
        if (suggested) shopAddIdInput.value = suggested;
      }

      renderShopDeliveryItems();
    }

    function applySelectedGameItem(item) {
      const id = String(item?.id || '').trim();
      const name = String(item?.name || '').trim();
      const iconUrl = String(item?.iconUrl || '').trim();
      const subText = String(item?.subText || '').trim();
      if (!id) return;

      shopSelectedItem.hidden = false;
      shopSelectedItemIcon.src = iconUrl || '';
      shopSelectedItemMain.textContent = name && name !== id
        ? `${name} (${id})`
        : id;
      shopSelectedItemSub.textContent = subText || iconUrl || '';
      const qty = normalizeBundleQty(shopQuantityInput.value || 1);
      addDeliveryItemToBundle(item, qty);
    }

    function renderGameItemList(items) {
      if (!shopGameItemList) return;
      const normalizedItems = Array.isArray(items)
        ? items.map((row) => normalizeCatalogItem(row)).filter(Boolean)
        : [];
      if (normalizedItems.length === 0) {
        shopGameItemList.innerHTML = '<div style="padding:10px; color:#9eb0d9;">ไม่พบไอเทมที่ค้นหา</div>';
        return;
      }
      shopGameItemList.innerHTML = normalizedItems
        .map((item, index) => {
          const id = escapeHtml(String(item.id || ''));
          const name = escapeHtml(String(item.name || id));
          const iconUrl = escapeHtml(String(item.iconUrl || ''));
          const subText = escapeHtml(String(item.subText || ''));
          const main = name !== id ? `${name} (${id})` : id;
          return [
            `<button type="button" class="catalog-option" data-catalog-idx="${index}" title="${id}">`,
            `<img src="${iconUrl}" alt="${id}">`,
            '<div>',
            `<div class="main">${main}</div>`,
            `<div class="sub">${subText || id}</div>`,
            '</div>',
            '</button>',
          ].join('');
        })
        .join('');

      const buttons = Array.from(shopGameItemList.querySelectorAll('.catalog-option'));
      buttons.forEach((button) => {
        button.addEventListener('click', () => {
          const idx = Number(button.dataset.catalogIdx || -1);
          const item = normalizedItems[idx];
          if (!item) return;
          applySelectedGameItem(item);
        });
      });
    }

    async function fetchGameItemCatalog(query = '') {
      if (!isAuthed) return;
      const currentRequestId = ++shopCatalogRequestId;
      const q = String(query || '').trim();
      const source = SHOP_CATALOG_ENDPOINTS[shopCatalogSource]
        ? shopCatalogSource
        : 'manifest';
      const limit = q ? 120 : source === 'icons' ? 40 : 120;
      const endpoint = SHOP_CATALOG_ENDPOINTS[source];
      const url = `${endpoint}?q=${encodeURIComponent(q)}&limit=${limit}`;
      const res = await api(url, 'GET');
      if (currentRequestId !== shopCatalogRequestId) return;
      renderGameItemList(Array.isArray(res?.data?.items) ? res.data.items : []);
    }

    function scheduleGameItemCatalogFetch(query = '') {
      if (shopCatalogFetchTimer) {
        clearTimeout(shopCatalogFetchTimer);
      }
      shopCatalogFetchTimer = setTimeout(() => {
        void fetchGameItemCatalog(query).catch((error) => {
          const sourceText = shopCatalogSource === 'manifest'
            ? 'Wiki/Manifest'
            : shopCatalogSource === 'weapons'
              ? 'อาวุธ Wiki'
              : 'คลังไอคอน';
          shopGameItemList.innerHTML = `<div style="padding:10px; color:#ff9aa8;">โหลดรายการไอเทม (${sourceText}) ไม่สำเร็จ: ${escapeHtml(String(error.message || error))}</div>`;
        });
      }, 200);
    }

    function updateShopKindUi() {
      if (!shopKindSelect) return;
      const isItem = String(shopKindSelect.value || 'item') === 'item';
      shopGameItemPickerField.classList.toggle('hidden', !isItem);
      shopQuantityField.classList.toggle('hidden', !isItem);
      updateShopCatalogSourceUi();
      shopGameItemSearchInput.disabled = !isItem;
      shopQuantityInput.disabled = !isItem;
      shopGameItemIdInput.disabled = !isItem;
      shopGameItemIconInput.disabled = !isItem;
      shopDeliveryItemsInput.disabled = !isItem;
      if (shopDeliveryProfileSelect) shopDeliveryProfileSelect.disabled = !isItem;
      if (shopDeliveryTeleportModeSelect) shopDeliveryTeleportModeSelect.disabled = !isItem;
      if (shopDeliveryTeleportTargetInput) shopDeliveryTeleportTargetInput.disabled = !isItem;
      if (shopDeliveryReturnTargetInput) shopDeliveryReturnTargetInput.disabled = !isItem;
      if (shopDeliveryPreCommandsInput) shopDeliveryPreCommandsInput.disabled = !isItem;
      if (shopDeliveryPostCommandsInput) shopDeliveryPostCommandsInput.disabled = !isItem;
      if (!isItem) {
        shopDeliveryItems = [];
        shopGameItemIdInput.value = '';
        shopGameItemIconInput.value = '';
        shopDeliveryItemsInput.value = '';
        if (shopDeliveryProfileSelect) shopDeliveryProfileSelect.value = '';
        if (shopDeliveryTeleportModeSelect) shopDeliveryTeleportModeSelect.value = '';
        if (shopDeliveryTeleportTargetInput) shopDeliveryTeleportTargetInput.value = '';
        if (shopDeliveryReturnTargetInput) shopDeliveryReturnTargetInput.value = '';
        if (shopDeliveryPreCommandsInput) shopDeliveryPreCommandsInput.value = '';
        if (shopDeliveryPostCommandsInput) shopDeliveryPostCommandsInput.value = '';
        shopSelectedItem.hidden = true;
        renderShopDeliveryItems();
      } else if (!shopGameItemList.innerHTML.trim()) {
        renderShopDeliveryItems();
        scheduleGameItemCatalogFetch('');
      } else {
        renderShopDeliveryItems();
      }
    }
