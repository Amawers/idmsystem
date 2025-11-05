# Stock Management Guide

## Overview

The Stock Management component provides a comprehensive interface for managing inventory stock levels in the IDM System. This guide explains how to use the stock management features.

## Accessing Stock Management

**Location:** Resource Allocation Management → Stock Tab

**Role Required:** Head

**Route:** `/resource/management` → Click "Stock" tab

---

## Features

### 1. **View Inventory**

The main table displays all inventory items with:
- Item name and storage location
- Category (food, medicine, supplies, relief goods)
- Current stock level
- Minimum stock threshold
- Unit cost
- Total value (current stock × unit cost)
- Status badge (Available, Low Stock, Critical, Depleted)

### 2. **Add New Item**

Click the **"Add Item"** button to add new inventory items.

**Required Fields:**
- Item Name (e.g., "Rice 25kg")
- Category (food, medicine, supplies, relief_goods)
- Initial Stock (starting quantity)
- Unit of Measure (sack, box, piece, etc.)
- Unit Cost (price per unit in ₱)
- Minimum Stock (alert threshold)

**Optional Fields:**
- Storage Location
- Description

**Example:**
```
Item Name: Rice 25kg
Category: Food
Initial Stock: 100
Unit: sack
Unit Cost: ₱50
Minimum Stock: 20
Location: Warehouse A
```

### 3. **Adjust Stock**

Click the **Edit button (pencil icon)** on any item to adjust stock.

#### Transaction Types:

**A. Stock In (Add Stock)**
- Use when: New deliveries arrive, donations received
- Example: Received 50 new sacks of rice
- Enter: +50 in quantity field

**B. Stock Out (Remove Stock)**
- Use when: Distributing to beneficiaries, using supplies
- Example: Distributed 10 sacks to families
- Enter: 10 in quantity field (system automatically subtracts)

**C. Adjustment (Correction)**
- Use when: Correcting errors, after physical inventory count
- Example: Physical count shows 95 sacks instead of 100
- Enter: Exact quantity (sets stock to that number)

**Notes Field:**
Add reason for adjustment (optional but recommended)

### 4. **Search & Filter**

**Search Box:**
- Search by item name or category
- Updates results in real-time

**Category Filter:**
- All Categories
- Food
- Medicine
- Supplies
- Relief Goods

**Status Filter:**
- All Status
- Available (stock above minimum)
- Low Stock (at or below minimum)
- Critical (very low or depleted)
- Depleted (no stock)

---

## Statistics Cards

### Total Items
Total number of items in inventory

### Total Value
Sum of (current stock × unit cost) for all items

### Low Stock
Count of items at or below minimum stock level

### Critical
Count of items in critical or depleted status

---

## How Stock Status is Calculated

The system automatically determines status based on current stock vs. minimum stock:

```
Status Logic:
- Depleted: current_stock = 0
- Critical: current_stock < (minimum_stock × 0.5)
- Low Stock: current_stock ≤ minimum_stock
- Available: current_stock > minimum_stock
```

**Examples:**
- Minimum: 20, Current: 25 → ✅ Available
- Minimum: 20, Current: 18 → ⚠️ Low Stock
- Minimum: 20, Current: 8 → 🔴 Critical
- Minimum: 20, Current: 0 → ⛔ Depleted

---

## Transaction History

All stock adjustments are automatically logged to the `inventory_transactions` table with:
- Item ID and name
- Transaction type (stock_in, stock_out, adjustment)
- Quantity changed
- User who performed the action
- Date and time
- Notes/reason

This creates a complete audit trail of all inventory movements.

---

## Database Integration

### Tables Used:

**inventory_items**
- Stores all inventory item master data
- Auto-calculates `total_value` on update
- Auto-updates `status` based on stock levels

**inventory_transactions**
- Logs every stock movement
- Auto-generates transaction numbers
- Links to user who made the change

**inventory_alerts**
- Auto-creates alerts when stock drops below minimum
- Triggers are set up to create alerts automatically

---

## Best Practices

### 1. **Regular Updates**
- Update stock immediately after distributions
- Perform physical counts monthly
- Use "Adjustment" to correct discrepancies

### 2. **Set Appropriate Minimums**
- Consider lead time for reordering
- Account for average usage rates
- Add buffer for emergencies

### 3. **Use Notes**
- Always add notes explaining adjustments
- Include reference numbers (PO, delivery receipts)
- Document reasons for corrections

### 4. **Monitor Alerts**
- Check "Alerts" tab daily
- Reorder when items reach minimum
- Don't wait until critical or depleted

### 5. **Accurate Data Entry**
- Double-check quantities before saving
- Use consistent unit of measure
- Verify unit costs are current

---

## Common Tasks

### Add New Stock Delivery

1. Click **Edit** button on the item
2. Select **"Stock In (Add Stock)"**
3. Enter quantity received
4. Add notes: "Delivery from [Supplier], PO #12345"
5. Click **"Update Stock"**

### Distribute to Beneficiary

1. Click **Edit** button on the item
2. Select **"Stock Out (Remove Stock)"**
3. Enter quantity distributed
4. Add notes: "Distributed to Case #C-2025-001"
5. Click **"Update Stock"**

### Physical Inventory Count

1. Count actual stock on hand
2. Click **Edit** button on the item
3. Select **"Adjustment (Correction)"**
4. Enter actual count from physical inventory
5. Add notes: "Physical count November 2025"
6. Click **"Update Stock"**

### Add Completely New Item

1. Click **"Add Item"** button
2. Fill in all required fields
3. Set minimum stock appropriately
4. Add description if needed
5. Click **"Add Item"**

---

## Troubleshooting

### "Insufficient stock" Error
**Cause:** Trying to remove more stock than available
**Solution:** Check current stock, reduce quantity, or use adjustment

### Item Not Appearing
**Cause:** Filters may be hiding the item
**Solution:** Clear search, set filters to "All"

### Cannot Add Item
**Cause:** Missing required fields or database connection issue
**Solution:** Fill all required fields, check internet connection

### Status Not Updating
**Cause:** Minimum stock threshold may need adjustment
**Solution:** Edit item and verify minimum stock setting

---

## Related Features

- **Dashboard Tab**: View inventory overview and statistics
- **Alerts Tab**: See low stock notifications
- **Approvals Tab**: Process resource requests that use inventory

---

**Last Updated:** November 5, 2025  
**Version:** 1.0.0
