import React, { useState, useEffect } from 'react';
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/card';
import { User, Settings, Database, Shield } from 'lucide-react';

const IAMPortal = () => {
  const [projects, setProjects] = useState([]);
  const [selectedProject, setSelectedProject] = useState(null);
  const [users, setUsers] = useState([]);
  const [roles, setRoles] = useState([]);
  const [apis, setAPIs] = useState([]);
  const [loading, setLoading] = useState(false);

  const fetchProjects = async () => {
    setLoading(true);
    try {
      const response = await fetch('/api/projects/');
      const data = await response.json();
      setProjects(data);
    } catch (error) {
      console.error('Error fetching projects:', error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchProjects();
  }, []);

  const handleProjectSelect = (project) => {
    setSelectedProject(project);
    fetchProjectUsers(project.id);
    fetchProjectAPIs(project.id);
  };

  const fetchProjectUsers = async (projectId) => {
    try {
      const response = await fetch(`/api/projects/${projectId}/users/`);
      const data = await response.json();
      setUsers(data);
    } catch (error) {
      console.error('Error fetching users:', error);
    }
  };

  const fetchProjectAPIs = async (projectId) => {
    try {
      const response = await fetch(`/api/projects/${projectId}/apis/`);
      const data = await response.json();
      setAPIs(data);
    } catch (error) {
      console.error('Error fetching APIs:', error);
    }
  };

  return (
    <div className="w-full max-w-6xl mx-auto p-4">
      <Card className="mb-6">
        <CardHeader>
          <CardTitle className="text-2xl font-bold flex items-center gap-2">
            <Shield className="w-6 h-6" />
            IAM Access Management Portal
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            {/* Projects Panel */}
            <Card className="p-4">
              <h2 className="text-lg font-semibold mb-4 flex items-center gap-2">
                <Database className="w-5 h-5" />
                Projects
              </h2>
              <div className="space-y-2">
                {projects.map((project) => (
                  <div
                    key={project.id}
                    className={`p-2 rounded cursor-pointer transition-colors ${
                      selectedProject?.id === project.id
                        ? 'bg-blue-100'
                        : 'hover:bg-gray-100'
                    }`}
                    onClick={() => handleProjectSelect(project)}
                  >
                    {project.name}
                  </div>
                ))}
              </div>
            </Card>

            {/* Users Panel */}
            <Card className="p-4">
              <h2 className="text-lg font-semibold mb-4 flex items-center gap-2">
                <User className="w-5 h-5" />
                Users
              </h2>
              <div className="space-y-2">
                {users.map((user) => (
                  <div key={user.id} className="p-2 border rounded">
                    <div className="font-medium">{user.email}</div>
                    <div className="text-sm text-gray-500">{user.role}</div>
                  </div>
                ))}
              </div>
            </Card>

            {/* APIs Panel */}
            <Card className="p-4">
              <h2 className="text-lg font-semibold mb-4 flex items-center gap-2">
                <Settings className="w-5 h-5" />
                API Access
              </h2>
              <div className="space-y-2">
                {apis.map((api) => (
                  <div key={api.id} className="p-2 border rounded flex justify-between items-center">
                    <span>{api.name}</span>
                    <label className="relative inline-flex items-center cursor-pointer">
                      <input
                        type="checkbox"
                        className="sr-only peer"
                        checked={api.enabled}
                        onChange={() => handleToggleAPI(api.id, !api.enabled)}
                      />
                      <div className="w-11 h-6 bg-gray-200 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-blue-600"></div>
                    </label>
                  </div>
                ))}
              </div>
            </Card>
          </div>
        </CardContent>
      </Card>

      {/* Access Management */}
      {selectedProject && (
        <Card className="mb-6">
          <CardHeader>
            <CardTitle className="text-xl font-bold">
              Access Management - {selectedProject.name}
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <h3 className="text-lg font-semibold mb-4">Grant Access</h3>
                <form className="space-y-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700">
                      User Email
                    </label>
                    <input
                      type="email"
                      className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700">
                      Role
                    </label>
                    <select className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500">
                      {roles.map((role) => (
                        <option key={role.id} value={role.id}>
                          {role.name}
                        </option>
                      ))}
                    </select>
                  </div>
                  <button
                    type="submit"
                    className="w-full bg-blue-500 text-white py-2 px-4 rounded hover:bg-blue-600 transition-colors"
                  >
                    Grant Access
                  </button>
                </form>
              </div>
              <div>
                <h3 className="text-lg font-semibold mb-4">Current Access</h3>
                <div className="space-y-2">
                  {users.map((user) => (
                    <div key={user.id} className="flex justify-between items-center p-2 border rounded">
                      <div>
                        <div className="font-medium">{user.email}</div>
                        <div className="text-sm text-gray-500">{user.role}</div>
                      </div>
                      <button
                        className="text-red-500 hover:text-red-600"
                        onClick={() => handleRevokeAccess(user.id)}
                      >
                        Revoke
                      </button>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
};

export default IAMPortal;