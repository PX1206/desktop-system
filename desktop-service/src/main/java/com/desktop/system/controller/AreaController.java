package com.desktop.system.controller;

import com.desktop.common.api.ApiResult;
import com.desktop.system.service.AreaService;
import com.desktop.system.vo.AreaTreeVO;
import com.desktop.system.vo.AreaVO;
import io.swagger.annotations.Api;
import io.swagger.annotations.ApiOperation;
import lombok.extern.slf4j.Slf4j;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

import java.util.List;

/**
 *  控制器
 *
 * @author Sakura
 * @since 2024-08-12
 */
@Slf4j
@RestController
@RequestMapping("/area")
@Api(value = "区域管理API", tags = {"区域管理"})
public class AreaController {

    @Autowired
    private AreaService areaService;

    @ApiOperation(value = "获取子区域列表", response = AreaVO.class)
    @GetMapping("getSubAreas/{parentId}")
    public ApiResult<List<AreaVO>> getSubAreas(@PathVariable Integer parentId) {
        List<AreaVO> areaVos = areaService.getSubAreas(parentId);
        return ApiResult.ok(areaVos);
    }

    @ApiOperation(value = "获取所有的区域", response = AreaTreeVO.class)
    @GetMapping("getAreas")
    public ApiResult<List<AreaTreeVO>> getAreas() throws Exception {
        List<AreaTreeVO> areaVos = areaService.getAreas();
        return ApiResult.ok(areaVos);
    }

}

