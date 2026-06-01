'use client';
import { createContext, useContext, useReducer, useEffect, ReactNode } from 'react';

export interface CartItem {
  cartId:       string;
  bundleId:     string;
  bundleName:   string;
  bundlePrice:  number;
  creatorHandle:string | null;
  creatorName:  string | null;
  schoolName:   string | null;
  addons:       string[];
  addonTotal:   number;
  editorState:  any;
  stickerData:  any;
  buttonSize:   string | null;
  buttonDesign: any;
  holoStyle:    string | null;
  holoStyleName:string | null;
  dropQR:       boolean;
  vaultPrints:  any[];
  mediaFile:    null;
  mediaType:    string | null;
  mediaUrl:     string | null;
  fulfillment:  'ship' | 'pickup';
  printCount:   number;
  isMulti:      boolean;
}

interface CartState {
  items:     CartItem[];
  step:      'browse' | 'customize' | 'cart' | 'checkout';
  editingId: string | null;
}

type CartAction =
  | { type: 'ADD_ITEM';    payload: CartItem }
  | { type: 'REMOVE_ITEM'; payload: string }
  | { type: 'UPDATE_ITEM'; payload: { cartId: string; updates: Partial<CartItem> } }
  | { type: 'CLEAR_CART' }
  | { type: 'SET_STEP';    payload: CartState['step'] }
  | { type: 'SET_EDITING'; payload: string | null }
  | { type: 'LOAD_CART';   payload: CartItem[] };

function cartReducer(state: CartState, action: CartAction): CartState {
  switch (action.type) {
    case 'ADD_ITEM':
      return { ...state, items: [...state.items, action.payload] };
    case 'REMOVE_ITEM':
      return { ...state, items: state.items.filter(i => i.cartId !== action.payload) };
    case 'UPDATE_ITEM':
      return {
        ...state,
        items: state.items.map(i =>
          i.cartId === action.payload.cartId
            ? { ...i, ...action.payload.updates }
            : i
        ),
      };
    case 'CLEAR_CART':
      return { ...state, items: [] };
    case 'SET_STEP':
      return { ...state, step: action.payload };
    case 'SET_EDITING':
      return { ...state, editingId: action.payload };
    case 'LOAD_CART':
      return { ...state, items: action.payload };
    default:
      return state;
  }
}

const CartContext = createContext<{
  state:      CartState;
  dispatch:   React.Dispatch<CartAction>;
  addItem:    (item: CartItem) => void;
  removeItem: (cartId: string) => void;
  updateItem: (cartId: string, updates: Partial<CartItem>) => void;
  clearCart:  () => void;
  cartTotal:  number;
  cartCount:  number;
} | null>(null);

const STORAGE_KEY = 'unmomento_cart';

function serializeCart(items: CartItem[]): any[] {
  return items.map(item => ({
    ...item,
    mediaFile: null,
    mediaUrl:  null,
  }));
}

export function CartProvider({ children }: { children: ReactNode }) {
  const [state, dispatch] = useReducer(cartReducer, {
    items:     [],
    step:      'browse',
    editingId: null,
  });

  useEffect(() => {
    try {
      const saved = localStorage.getItem(STORAGE_KEY);
      if (saved) {
        const items = JSON.parse(saved) as CartItem[];
        if (items.length > 0) dispatch({ type: 'LOAD_CART', payload: items });
      }
    } catch (e) {
      console.error('[cart] load error:', e);
    }
  }, []);

  useEffect(() => {
    try {
      if (state.items.length > 0) {
        localStorage.setItem(STORAGE_KEY, JSON.stringify(serializeCart(state.items)));
      } else {
        localStorage.removeItem(STORAGE_KEY);
      }
    } catch (e) {
      console.error('[cart] save error:', e);
    }
  }, [state.items]);

  function addItem(item: CartItem) {
    dispatch({ type: 'ADD_ITEM', payload: item });
  }

  function removeItem(cartId: string) {
    dispatch({ type: 'REMOVE_ITEM', payload: cartId });
  }

  function updateItem(cartId: string, updates: Partial<CartItem>) {
    dispatch({ type: 'UPDATE_ITEM', payload: { cartId, updates } });
  }

  function clearCart() {
    dispatch({ type: 'CLEAR_CART' });
    localStorage.removeItem(STORAGE_KEY);
  }

  const ADDON_PRICES: Record<string,number> = {
    qr_video:10, card_jacket:5, metallic_marker:4,
    oil_marker:4, extra_print:10, extra_sticker:12, holo_upgrade:2,
  };

  const cartTotal = state.items.reduce((sum, item) => {
    const addonSum = (item.addons||[]).reduce(
      (s,id) => s + (ADDON_PRICES[id]||0), 0
    );
    return sum + item.bundlePrice + addonSum + (item.dropQR ? 5 : 0);
  }, 0);

  const cartCount = state.items.length;

  return (
    <CartContext.Provider value={{
      state, dispatch, addItem, removeItem, updateItem, clearCart,
      cartTotal, cartCount,
    }}>
      {children}
    </CartContext.Provider>
  );
}

export function useCart() {
  const ctx = useContext(CartContext);
  if (!ctx) throw new Error('useCart must be used within CartProvider');
  return ctx;
}

export function generateCartId(): string {
  return `cart_${Date.now()}_${Math.random().toString(36).slice(2,7)}`;
}