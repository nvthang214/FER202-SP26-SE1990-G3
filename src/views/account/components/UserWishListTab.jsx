import React from 'react';
import { useWishlist } from '@/hooks';

const UserWishListTab = () => {
  const { wishlist, removeWishlist } = useWishlist();

  return (
    <div className="loader" style={{ minHeight: '80vh', alignItems: 'flex-start', padding: '2rem' }}>
      <h3>My Wish List</h3>
      {wishlist.length === 0 ? (
        <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', height: '100%' }}>
          <strong><span className="text-subtle">You don&apos;t have a wish list</span></strong>
        </div>
      ) : (
        <div style={{ 
          display: 'grid', 
          gridTemplateColumns: 'repeat(auto-fill, minmax(250px, 1fr))', 
          gap: '2rem', 
          padding: '1rem 0',
          width: '100%'
        }}>
          {wishlist.map(item => (
            <div 
              key={item.id} 
              style={{ 
                display: 'flex', 
                flexDirection: 'column',
                border: '1px solid #eaeaea',
                backgroundColor: '#fff',
                borderRadius: '8px',
                overflow: 'hidden',
                boxShadow: '0 4px 6px rgba(0,0,0,0.04)',
                textAlign: 'left'
              }}
            >
              <div style={{ width: '100%', height: '200px', backgroundColor: '#f8f8f8', padding: '10px' }}>
                <img 
                  src={item.image} 
                  alt={item.name} 
                  style={{ width: '100%', height: '100%', objectFit: 'contain' }} 
                />
              </div>
              <div style={{ padding: '15px', display: 'flex', flexDirection: 'column', flex: 1 }}>
                <span style={{ fontSize: '1.6rem', fontWeight: '600', color: '#111', marginBottom: '5px' }}>
                  {item.name}
                </span>
                <span style={{ fontSize: '1.3rem', color: '#777', marginBottom: '15px' }}>
                  {item.brand || 'Apparel'}
                </span>
                <div style={{ marginTop: 'auto', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                  <span style={{ fontSize: '1.8rem', color: '#000', fontWeight: 'bold' }}>
                    ${item.price}
                  </span>
                  <button 
                    className="button button-small" 
                    style={{ backgroundColor: '#ff4d4f', color: '#fff', border: 'none', padding: '0 10px', height: '32px' }} 
                    onClick={() => removeWishlist(item.id)}
                  >
                    Remove
                  </button>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
};

export default UserWishListTab;
