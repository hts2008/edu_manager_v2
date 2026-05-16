export function userToDto(user: any) {
  return {
    id: user.id,
    username: user.username,
    full_name: user.fullName,
    role: user.role,
    email: user.email,
    phone: user.phone,
    status: user.status,
    last_login: user.lastLogin,
    created_at: user.createdAt,
    updated_at: user.updatedAt,
  };
}
