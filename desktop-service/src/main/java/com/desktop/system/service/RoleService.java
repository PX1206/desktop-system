package com.desktop.system.service;

import com.desktop.common.base.BaseService;
import com.desktop.common.pagination.Paging;
import com.desktop.system.entity.Role;
import com.desktop.system.param.RoleMenuParam;
import com.desktop.system.param.RolePageParam;
import com.desktop.system.param.RoleParam;
import com.desktop.system.param.UserRoleParam;
import com.desktop.system.vo.RoleVO;

import java.util.List;

public interface RoleService extends BaseService<Role> {

    Paging<RoleVO> getRolePageList(RolePageParam rolePageParam) throws Exception;

    boolean addRole(RoleParam roleParam) throws Exception;

    boolean updateRole(RoleParam roleParam) throws Exception;

    boolean deleteRole(Long id) throws Exception;

    boolean toggleStatus(Long id) throws Exception;

    boolean saveRoleMenus(RoleMenuParam roleMenuParam) throws Exception;

    List<Long> getRoleMenuIds(Long roleId) throws Exception;

    boolean saveUserRoles(UserRoleParam userRoleParam) throws Exception;

    List<Long> getUserRoleIds(Long userId) throws Exception;

    List<RoleVO> getAllRoles() throws Exception;
}
