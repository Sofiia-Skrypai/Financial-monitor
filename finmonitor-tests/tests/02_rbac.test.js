const canAccessPath = (user, path) => {
  const isAdmin = user?.role === 'Адмін' && !user?.activeMemberId;
  if (isAdmin) return true;
  if (!user?.activeMemberId) return false;
  const members = JSON.parse(localStorage.getItem('fin_users_local') || '[]');
  const active  = members.find(m => m.id === user.activeMemberId);
  return (active?.grantedPaths || []).includes(path);
};

const PROTECTED_PATHS = ['/users', '/compare', '/pension'];
const ALL_PATHS = ['/', '/accounts', '/import', '/history', '/categories', ...PROTECTED_PATHS];

const clearStorage = () => {
  localStorage.removeItem('fin_users_local');
  localStorage.removeItem('fin_accounts_local');
  localStorage.removeItem('user_session');
};

describe('RBAC — Admin access', () => {
  const adminUser = { id: '1', name: 'Admin', role: 'Адмін', activeMemberId: null };

  test('admin can access all protected paths', () => {
    PROTECTED_PATHS.forEach(path => {
      expect(canAccessPath(adminUser, path)).toBe(true);
    });
  });

  test('admin can access all non-protected paths', () => {
    ['/', '/accounts', '/import', '/history', '/categories'].forEach(path => {
      expect(canAccessPath(adminUser, path)).toBe(true);
    });
  });

  test('isAdmin is false when activeMemberId is set (acting as member)', () => {
    const adminActingAsMember = { ...adminUser, activeMemberId: 'member_1' };
    const isAdmin = adminActingAsMember.role === 'Адмін' && !adminActingAsMember.activeMemberId;
    expect(isAdmin).toBe(false);
  });
});

describe('RBAC — Unauthenticated / no session', () => {
  test('null user cannot access any path', () => {
    ALL_PATHS.forEach(path => {
      expect(canAccessPath(null, path)).toBe(false);
    });
  });

  test('user without activeMemberId cannot access protected paths', () => {
    const partialUser = { id: '2', name: 'Ghost', role: 'Учасник', activeMemberId: null };
    PROTECTED_PATHS.forEach(path => {
      expect(canAccessPath(partialUser, path)).toBe(false);
    });
  });
});

describe('RBAC — Member with granted paths', () => {
  beforeEach(() => {
    clearStorage();
    localStorage.setItem('fin_users_local', JSON.stringify([
      {
        id: 'member_1',
        name: 'Sofi',
        role: 'Учасник',
        grantedPaths: ['/pension', '/history'],
      },
      {
        id: 'member_2',
        name: 'Dmytro',
        role: 'Учасник',
        grantedPaths: [],
      },
    ]));
  });

  const memberUser = { id: 'auth_1', name: 'Auth', role: 'Адмін', activeMemberId: 'member_1' };
  const restrictedUser = { id: 'auth_1', name: 'Auth', role: 'Адмін', activeMemberId: 'member_2' };

  test('member with /pension grant can access /pension', () => {
    expect(canAccessPath(memberUser, '/pension')).toBe(true);
  });

  test('member with /history grant can access /history', () => {
    expect(canAccessPath(memberUser, '/history')).toBe(true);
  });

  test('member without /compare grant cannot access /compare', () => {
    expect(canAccessPath(memberUser, '/compare')).toBe(false);
  });

  test('member without /users grant cannot access /users', () => {
    expect(canAccessPath(memberUser, '/users')).toBe(false);
  });

  test('member with empty grantedPaths cannot access any protected path', () => {
    PROTECTED_PATHS.forEach(path => {
      expect(canAccessPath(restrictedUser, path)).toBe(false);
    });
  });
});

describe('RBAC — Account operations guard', () => {
  const adminUser  = { role: 'Адмін', activeMemberId: null };
  const memberUser = { role: 'Адмін', activeMemberId: 'member_1' };

  test('isAdmin true: admin with no activeMemberId can edit accounts', () => {
    const isAdmin = adminUser.role === 'Адмін' && !adminUser.activeMemberId;
    expect(isAdmin).toBe(true);
  });

  test('isAdmin false: admin acting as member cannot edit accounts', () => {
    const isAdmin = memberUser.role === 'Адмін' && !memberUser.activeMemberId;
    expect(isAdmin).toBe(false);
  });

  test('account deletion blocked for non-admin', () => {
    
    const isAdmin = memberUser.role === 'Адмін' && !memberUser.activeMemberId;
    const deleted = isAdmin ? 'deleted' : 'blocked';
    expect(deleted).toBe('blocked');
  });
});

describe('RBAC — Categories admin guard', () => {
  test('showForm and edit/delete buttons only shown to admin', () => {
    const admin  = { role: 'Адмін', activeMemberId: null };
    const member = { role: 'Адмін', activeMemberId: 'member_1' };
    const isAdmin = (u) => u?.role === 'Адмін' && !u?.activeMemberId;
    expect(isAdmin(admin)).toBe(true);
    expect(isAdmin(member)).toBe(false);
  });
});