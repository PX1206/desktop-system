package com.desktop.system.mapper;

import com.baomidou.mybatisplus.core.mapper.BaseMapper;
import com.baomidou.mybatisplus.core.metadata.IPage;
import com.baomidou.mybatisplus.extension.plugins.pagination.Page;
import com.desktop.system.entity.SysOperationLog;
import com.desktop.system.param.SysOperationLogPageParam;
import com.desktop.system.vo.SysOperationLogVO;
import org.apache.ibatis.annotations.Mapper;
import org.apache.ibatis.annotations.Param;

/**
 *  Mapper 接口
 *
 * @author Sakura
 * @since 2023-10-24
 */
@Mapper
public interface SysOperationLogMapper extends BaseMapper<SysOperationLog> {

    IPage<SysOperationLogVO> getSysOperationLogList(@Param("page") Page page, @Param("param") SysOperationLogPageParam param);


}
