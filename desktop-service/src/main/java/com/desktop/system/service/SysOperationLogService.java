package com.desktop.system.service;

import com.desktop.common.base.BaseService;
import com.desktop.common.pagination.Paging;
import com.desktop.system.entity.SysOperationLog;
import com.desktop.system.param.SysOperationLogPageParam;
import com.desktop.system.vo.SysOperationLogVO;

/**
 *  服务类
 *
 * @author Sakura
 * @since 2023-10-24
 */
public interface SysOperationLogService extends BaseService<SysOperationLog> {

    /**
     * 详情
     *
     * @param id
     * @return
     * @throws Exception
     */
    SysOperationLogVO getSysOperationLog(Long id) throws Exception;


    /**
     * 获取分页对象
     *
     * @param sysOperationLogPageParam
     * @return
     * @throws Exception
     */
    Paging<SysOperationLogVO> getSysOperationLogPageList(SysOperationLogPageParam sysOperationLogPageParam) throws Exception;

}
