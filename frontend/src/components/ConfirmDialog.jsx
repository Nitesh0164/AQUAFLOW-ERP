import React from 'react';
import Modal from './Modal';
import './ConfirmDialog.css';

const ConfirmDialog = ({ isOpen, title, message, onConfirm, onCancel, confirmText = 'Confirm', isDanger = false }) => {
  return (
    <Modal isOpen={isOpen} onClose={onCancel} title={title}>
      <div className="confirm-dialog-body">
        <p>{message}</p>
        <div className="confirm-dialog-actions">
          <button className="btn-cancel" onClick={onCancel}>Cancel</button>
          <button 
            className={`btn-confirm ${isDanger ? 'btn-danger' : 'btn-primary'}`} 
            onClick={onConfirm}
          >
            {confirmText}
          </button>
        </div>
      </div>
    </Modal>
  );
};

export default ConfirmDialog;
