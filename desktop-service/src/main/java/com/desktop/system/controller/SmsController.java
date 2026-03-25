package com.desktop.system.controller;

import com.desktop.common.api.ApiResult;
import com.desktop.common.enums.OperationLogType;
import com.desktop.common.log.Module;
import com.desktop.common.log.OperationLog;
import com.desktop.system.param.SmsCodeParam;
import com.desktop.system.service.SmsService;
import io.swagger.annotations.Api;
import io.swagger.annotations.ApiOperation;
import lombok.extern.slf4j.Slf4j;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.validation.annotation.Validated;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

/**
 * @author Sakura
 * @date 2023/8/14 14:15
 */
@Slf4j
@RestController
@RequestMapping("/sms")
@Module("desktop")
@Api(value = "短信验证码管理", tags = {"短信验证码管理"})
public class SmsController {

    @Autowired
    private SmsService smsService;

    /**
     * 短信验证码
     */
    @PostMapping(value = "/getCode")
    @OperationLog(name = "获取短信验证码", type = OperationLogType.INFO)
    @ApiOperation(value = "获取短信验证码")
    public ApiResult<String> getSMSCode(@Validated @RequestBody SmsCodeParam smsCodeParam) throws Exception {
        String msg = smsService.getSMSCode(smsCodeParam);
        return ApiResult.ok(msg);
    }
}
