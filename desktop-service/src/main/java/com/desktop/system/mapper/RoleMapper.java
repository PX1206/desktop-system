package com.desktop.system.mapper;

import com.baomidou.mybatisplus.core.mapper.BaseMapper;
import com.baomidou.mybatisplus.core.metadata.IPage;
import com.baomidou.mybatisplus.extension.plugins.pagination.Page;
import com.desktop.system.entity.Role;
import com.desktop.system.param.RolePageParam;
import com.desktop.system.vo.RoleVO;
import org.apache.ibatis.annotations.Mapper;
import org.apache.ibatis.annotations.Param;

@Mapper
public interface RoleMapper extends BaseMapper<Role> {

    IPage<RoleVO> getRoleList(@Param("page") Page page, @Param("param") RolePageParam param);
}
