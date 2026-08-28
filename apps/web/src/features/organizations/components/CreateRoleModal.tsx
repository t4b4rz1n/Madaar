import React, { useState } from 'react';
import { useTranslation } from 'react-i18next';

// Define the permissions structure
const PERMISSION_GROUPS = [
  {
    category: 'USERS',
    items: [
      { id: 'user.manage', label: 'Manage Users', isDefault: false },
      { id: 'user.view', label: 'View Users', isDefault: true },
    ]
  },
  {
    category: 'ROLES',
    items: [
      { id: 'org.manage_roles', label: 'Manage Roles', isDefault: false },
    ]
  },
  {
    category: 'KANBAN',
    items: [
      { id: 'kanban.manage', label: 'Manage Kanban', isDefault: false },
      { id: 'task.view', label: 'View Tasks', isDefault: true },
      { id: 'board.view', label: 'View Boards', isDefault: true },
    ]
  },
  {
    category: 'NOTIFICATIONS',
    items: [
      { id: 'notification.send', label: 'Send Notifications', isDefault: false },
      { id: 'notification.view', label: 'View Notifications', isDefault: true },
    ]
  },
  {
    category: 'TEAMS',
    items: [
      { id: 'team.manage', label: 'Manage Teams', isDefault: false },
      { id: 'team.view', label: 'View Teams', isDefault: true },
    ]
  },
  {
    category: 'PROJECTS',
    items: [
      { id: 'project.manage', label: 'Manage Projects', isDefault: false },
      { id: 'project.view', label: 'View Projects', isDefault: true },
    ]
  },
  {
    category: 'AUTOMATIONS',
    items: [
      { id: 'automation.manage', label: 'Manage Automations', isDefault: false },
      { id: 'automation.view', label: 'View Automations', isDefault: true },
    ]
  }
];

export const CreateRoleModal = ({ isOpen, onClose }) => {
  const { t } = useTranslation();
  
  const [roleName, setRoleName] = useState('');
  const [description, setDescription] = useState('');
  const [isActive, setIsActive] = useState(true);
  const [isStaff, setIsStaff] = useState(false);
  const [selectedPerms, setSelectedPerms] = useState<string[]>([]);

  if (!isOpen) return null;

  const handleTogglePerm = (id: string, isDefault: boolean) => {
    if (isDefault) return; // Cannot toggle default permissions
    setSelectedPerms(prev => 
      prev.includes(id) ? prev.filter(p => p !== id) : [...prev, id]
    );
  };

  const handleSave = () => {
    // API call would go here
    console.log({ roleName, description, isActive, isStaff, selectedPerms });
    onClose();
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm">
      <div className="bg-slate-900/90 border border-slate-700/60 shadow-2xl rounded-2xl w-full max-w-2xl overflow-hidden flex flex-col max-h-[90vh]">
        
        {/* Header */}
        <div className="flex justify-between items-start p-6 border-b border-slate-700/50">
          <div>
            <h2 className="text-xl font-semibold text-slate-100">Create New Role</h2>
            <p className="text-sm text-slate-400 mt-1">Manage role details and permissions</p>
          </div>
          <button 
            onClick={onClose}
            className="text-slate-400 hover:text-white transition-colors"
          >
            <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>

        {/* Body */}
        <div className="p-6 overflow-y-auto custom-scrollbar flex-1">
          <div className="flex gap-6 mb-6">
            <div className="flex-1">
              <label className="block text-sm font-medium text-slate-300 mb-2">Role Name</label>
              <input 
                type="text" 
                value={roleName}
                onChange={e => setRoleName(e.target.value)}
                placeholder="e.g. Manager" 
                className="w-full bg-slate-800/50 border border-slate-700 rounded-lg px-4 py-2 text-slate-200 placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-blue-500/50"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-slate-300 mb-2">Status & Staff</label>
              <div className="flex items-center gap-4 h-10">
                <label className="flex items-center gap-2 cursor-pointer">
                  <input 
                    type="checkbox" 
                    checked={isActive}
                    onChange={() => setIsActive(!isActive)}
                    className="w-4 h-4 rounded-full text-blue-500 focus:ring-blue-500/50 bg-slate-800 border-slate-600"
                  />
                  <span className="text-sm text-slate-300">Active</span>
                </label>
                <label className="flex items-center gap-2 cursor-pointer">
                  <input 
                    type="checkbox" 
                    checked={isStaff}
                    onChange={() => setIsStaff(!isStaff)}
                    className="w-4 h-4 rounded-full text-blue-500 focus:ring-blue-500/50 bg-slate-800 border-slate-600"
                  />
                  <span className="text-sm text-slate-300">Staff</span>
                </label>
              </div>
            </div>
          </div>

          <div className="mb-8">
            <label className="block text-sm font-medium text-slate-300 mb-2">Description</label>
            <textarea 
              value={description}
              onChange={e => setDescription(e.target.value)}
              placeholder="Short description..." 
              rows={3}
              className="w-full bg-slate-800/50 border border-slate-700 rounded-lg px-4 py-3 text-slate-200 placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-blue-500/50 resize-none"
            />
          </div>

          <div>
            <div className="flex items-center gap-2 mb-4">
              <div className="w-1 h-4 bg-blue-500 rounded-full"></div>
              <h3 className="text-sm font-semibold text-slate-200">Manage Permissions</h3>
            </div>
            
            <div className="bg-slate-800/30 border border-slate-700/50 rounded-xl p-6">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-x-8 gap-y-6">
                {PERMISSION_GROUPS.map((group) => (
                  <div key={group.category}>
                    <h4 className="text-xs font-bold text-slate-500 mb-3 uppercase tracking-wider">{group.category}</h4>
                    <div className="space-y-3">
                      {group.items.map(perm => {
                        const isChecked = perm.isDefault || selectedPerms.includes(perm.id);
                        return (
                          <label 
                            key={perm.id} 
                            className={`flex items-center gap-3 ${perm.isDefault ? 'opacity-60 cursor-not-allowed' : 'cursor-pointer group'}`}
                          >
                            <div className="relative flex items-center justify-center">
                              <input 
                                type="checkbox" 
                                checked={isChecked}
                                onChange={() => handleTogglePerm(perm.id, perm.isDefault)}
                                disabled={perm.isDefault}
                                className="peer appearance-none w-4 h-4 rounded-full border border-slate-500 checked:border-blue-500 checked:bg-transparent transition-all"
                              />
                              {isChecked && (
                                <div className="absolute w-2 h-2 rounded-full bg-blue-500 pointer-events-none"></div>
                              )}
                            </div>
                            <span className="text-sm text-slate-300 group-hover:text-slate-100 transition-colors">
                              {perm.label}
                            </span>
                          </label>
                        );
                      })}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>

        {/* Footer */}
        <div className="p-6 border-t border-slate-700/50 flex justify-end gap-3 bg-slate-900/50">
          <button 
            onClick={onClose}
            className="px-5 py-2 text-sm font-medium text-slate-300 hover:text-white transition-colors"
          >
            Cancel
          </button>
          <button 
            onClick={handleSave}
            className="px-6 py-2 bg-blue-500 hover:bg-blue-600 text-white text-sm font-medium rounded-lg transition-colors shadow-lg shadow-blue-500/20"
          >
            Save Role
          </button>
        </div>

      </div>
    </div>
  );
};
