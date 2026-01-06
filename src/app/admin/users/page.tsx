"use client";

import { useEffect, useState } from "react";
import {
  Users,
  Search,
  Filter,
  MoreVertical,
  Shield,
  Ban,
  CheckCircle,
  XCircle,
  Eye,
  Activity,
} from "lucide-react";
import Link from "next/link";
import DashboardLayout from "@/components/DashboardLayout";

interface User {
  id: string;
  name: string | null;
  email: string | null;
  role: string;
  createdAt: string;
  emailVerified: string | null;
  _count: {
    properties: number;
    leads: number;
  };
}

export default function AdminUsersPage() {
  const [users, setUsers] = useState<User[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState("");
  const [roleFilter, setRoleFilter] = useState<string>("ALL");
  const [selectedUser, setSelectedUser] = useState<User | null>(null);
  const [showRoleModal, setShowRoleModal] = useState(false);
  const [showDeleteModal, setShowDeleteModal] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);

  useEffect(() => {
    fetchUsers();
  }, []);

  const fetchUsers = async () => {
    try {
      const response = await fetch("/api/admin/users");
      if (response.ok) {
        const data = await response.json();
        setUsers(data.users);
      }
    } catch (error) {
      console.error("Error fetching users:", error);
    } finally {
      setLoading(false);
    }
  };

  const handleChangeRole = async (userId: string, newRole: string) => {
    try {
      const response = await fetch(`/api/admin/users/${userId}/role`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ role: newRole }),
      });

      if (response.ok) {
        await fetchUsers();
        setShowRoleModal(false);
        setSelectedUser(null);
      } else {
        alert("Erro ao atualizar role");
      }
    } catch (error) {
      console.error("Error updating role:", error);
      alert("Erro ao atualizar role");
    }
  };

  const handleDeleteUser = async (userId: string) => {
    try {
      setIsDeleting(true);
      const response = await fetch(`/api/admin/users/${userId}`, {
        method: "DELETE",
      });

      if (response.ok) {
        await fetchUsers();
        setShowDeleteModal(false);
        setSelectedUser(null);
      } else {
        const data = await response.json().catch(() => null);
        alert(data?.error || "Erro ao excluir usuário");
      }
    } catch (error) {
      console.error("Error deleting user:", error);
      alert("Erro ao excluir usuário");
    } finally {
      setIsDeleting(false);
    }
  };

  const filteredUsers = users.filter((user) => {
    const matchesSearch =
      user.name?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      user.email?.toLowerCase().includes(searchTerm.toLowerCase());
    const matchesRole = roleFilter === "ALL" || user.role === roleFilter;
    return matchesSearch && matchesRole;
  });

  const getRoleBadge = (role: string) => {
    const styles = {
      ADMIN: "bg-red-100 text-red-700",
      REALTOR: "bg-blue-100 text-blue-700",
      OWNER: "bg-green-100 text-green-700",
      USER: "bg-gray-100 text-gray-700",
    };
    return styles[role as keyof typeof styles] || styles.USER;
  };

  const getRoleLabel = (role: string) => {
    const labels = {
      ADMIN: "Administrador",
      REALTOR: "Corretor",
      OWNER: "Proprietário",
      USER: "Usuário",
    };
    return labels[role as keyof typeof labels] || role;
  };


  if (loading) {
    return (
      <DashboardLayout
        title="Gerenciar Usuários"
        description="Visualizar e gerenciar todos os usuários do sistema"
        breadcrumbs={[
          { label: "Home", href: "/" },
          { label: "Admin", href: "/admin" },
          { label: "Usuários" },
        ]}
      >
        <div className="flex items-center justify-center py-20">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
        </div>
      </DashboardLayout>
    );
  }

  return (
    <DashboardLayout
      title="Gerenciar Usuários"
      description={`${filteredUsers.length} usuários encontrados`}
      breadcrumbs={[
        { label: "Home", href: "/" },
        { label: "Admin", href: "/admin" },
        { label: "Usuários" },
      ]}
    >
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="bg-white rounded-xl shadow-sm border border-gray-200">
          <div className="p-6 border-b border-gray-200">
            {/* Filters */}
            <div className="flex flex-col sm:flex-row gap-4">
            <div className="flex-1 relative">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-5 h-5" />
              <input
                type="text"
                placeholder="Buscar por nome ou email..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              />
            </div>
            <select
              value={roleFilter}
              onChange={(e) => setRoleFilter(e.target.value)}
              className="px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            >
              <option value="ALL">Todos os Roles</option>
              <option value="ADMIN">Administradores</option>
              <option value="REALTOR">Corretores</option>
              <option value="OWNER">Proprietários</option>
              <option value="USER">Usuários</option>
            </select>
            </div>
          </div>

          {/* Users Table */}
        <div className="bg-white rounded-xl shadow-sm border border-gray-100 overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead className="bg-gray-50 border-b border-gray-200">
                <tr>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Usuário
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Role
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Imóveis
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Leads
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Cadastro
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Status
                  </th>
                  <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Ações
                  </th>
                </tr>
              </thead>
              <tbody className="bg-white divide-y divide-gray-200">
                {filteredUsers.map((user) => (
                  <tr key={user.id} className="hover:bg-gray-50">
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div>
                        <div className="text-sm font-medium text-gray-900">
                          {user.name || "Sem nome"}
                        </div>
                        <div className="text-sm text-gray-500">{user.email}</div>
                      </div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <span
                        className={`px-3 py-1 inline-flex text-xs leading-5 font-semibold rounded-full ${getRoleBadge(
                          user.role
                        )}`}
                      >
                        {getRoleLabel(user.role)}
                      </span>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                      {user._count.properties}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                      {user._count.leads}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                      {new Date(user.createdAt).toLocaleDateString("pt-BR")}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      {user.emailVerified ? (
                        <span className="flex items-center text-sm text-green-600">
                          <CheckCircle className="w-4 h-4 mr-1" />
                          Verificado
                        </span>
                      ) : (
                        <span className="flex items-center text-sm text-gray-400">
                          <XCircle className="w-4 h-4 mr-1" />
                          Não verificado
                        </span>
                      )}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-medium">
                      <div className="flex items-center justify-end gap-2">
                        {user.role === "OWNER" && (
                          <Link
                            href={`/owner/dashboard?previewUserId=${user.id}`}
                            className="text-gray-500 hover:text-gray-800"
                            title="Ver como proprietário"
                          >
                            <Eye className="w-5 h-5" />
                          </Link>
                        )}
                        {user.role === "REALTOR" && (
                          <Link
                            href={`/broker/dashboard?previewUserId=${user.id}`}
                            className="text-gray-500 hover:text-gray-800"
                            title="Ver como corretor"
                          >
                            <Eye className="w-5 h-5" />
                          </Link>
                        )}
                        {user.role === "REALTOR" && (
                          <Link
                            href={`/admin/realtors/${user.id}`}
                            className="text-blue-600 hover:text-blue-900"
                            title="Painel 360º do corretor"
                          >
                            <Activity className="w-5 h-5" />
                          </Link>
                        )}
                        <button
                          onClick={() => {
                            setSelectedUser(user);
                            setShowRoleModal(true);
                          }}
                          className="text-blue-600 hover:text-blue-900"
                          title="Alterar role"
                        >
                          <Shield className="w-5 h-5" />
                        </button>
                        {user.role !== "ADMIN" && (
                          <button
                            onClick={() => {
                              setSelectedUser(user);
                              setShowDeleteModal(true);
                            }}
                            className="text-red-600 hover:text-red-800"
                            title="Excluir usuário"
                          >
                            <Ban className="w-5 h-5" />
                          </button>
                        )}
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
        </div>
      </div>

      {/* Role Change Modal */}
      {showRoleModal && selectedUser && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
          <div className="bg-white rounded-xl shadow-xl max-w-md w-full p-6">
            <h3 className="text-xl font-bold text-gray-900 mb-4">
              Alterar Role de {selectedUser.name}
            </h3>
            <p className="text-gray-600 mb-6">
              Selecione o novo role para este usuário:
            </p>
            <div className="space-y-3">
              {["ADMIN", "REALTOR", "OWNER", "USER"].map((role) => (
                <button
                  key={role}
                  onClick={() => handleChangeRole(selectedUser.id, role)}
                  disabled={selectedUser.role === role}
                  className={`w-full p-4 rounded-lg border-2 text-left transition-all ${
                    selectedUser.role === role
                      ? "border-blue-600 bg-blue-50 cursor-not-allowed"
                      : "border-gray-200 hover:border-blue-300 hover:bg-blue-50"
                  }`}
                >
                  <div className="font-semibold text-gray-900">
                    {getRoleLabel(role)}
                  </div>
                  {selectedUser.role === role && (
                    <div className="text-sm text-blue-600 mt-1">
                      Role atual
                    </div>
                  )}
                </button>
              ))}
            </div>
            {selectedUser.role === "REALTOR" && (
              <></>
            )}
            <div className="mt-6 flex gap-3">
              <button
                onClick={() => {
                  setShowRoleModal(false);
                  setSelectedUser(null);
                }}
                className="flex-1 px-4 py-2 border border-gray-300 rounded-lg hover:bg-gray-50 transition-colors"
              >
                Cancelar
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Delete User Modal */}
      {showDeleteModal && selectedUser && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
          <div className="bg-white rounded-xl shadow-xl max-w-md w-full p-6">
            <h3 className="text-xl font-bold text-gray-900 mb-4">
              Excluir usuário
            </h3>
            <p className="text-gray-700 mb-3">
              Tem certeza que deseja excluir o usuário
              {" "}
              <span className="font-semibold">
                {selectedUser.name || selectedUser.email}
              </span>
              ?
            </p>
            <p className="text-sm text-gray-500 mb-6">
              A conta será removida do sistema e, se essa pessoa tentar fazer
              login novamente, vai precisar passar por todo o fluxo de cadastro
              outra vez. Imóveis e leads existentes permanecem, apenas sem o
              vínculo com este usuário.
            </p>
            <div className="mt-4 flex gap-3">
              <button
                onClick={() => {
                  setShowDeleteModal(false);
                  setSelectedUser(null);
                }}
                className="flex-1 px-4 py-2 border border-gray-300 rounded-lg hover:bg-gray-50 transition-colors text-sm font-medium"
              >
                Cancelar
              </button>
              <button
                onClick={() => handleDeleteUser(selectedUser.id)}
                disabled={isDeleting}
                className="flex-1 px-4 py-2 rounded-lg bg-red-600 text-white hover:bg-red-700 transition-colors text-sm font-semibold disabled:opacity-60 disabled:cursor-not-allowed"
              >
                {isDeleting ? "Excluindo..." : "Excluir usuário"}
              </button>
            </div>
          </div>
        </div>
      )}
    </DashboardLayout>
  );
}
