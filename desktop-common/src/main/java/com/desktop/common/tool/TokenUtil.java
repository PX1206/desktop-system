package com.desktop.common.tool;

import com.desktop.common.constant.CommonConstant;
import org.springframework.web.context.request.RequestContextHolder;
import org.springframework.web.context.request.ServletRequestAttributes;

import javax.servlet.http.HttpServletRequest;

/**
 * @author Sakura
 * @date 2023/8/10 10:52
 */
public class TokenUtil {

    /**
     * 从请求头或者请求参数中
     *
     * @return
     */
    public static String getToken() {
        return getToken(getRequest());
    }

    /**
     * 从请求头或者请求参数中
     *
     * @param request
     * @return
     */
    public static String getToken(HttpServletRequest request) {
        if (request == null) {
            return null;
        }
        // 从请求头中获取token
        String token = request.getHeader(CommonConstant.ACCESS_TOKEN);
        if (StringUtil.isBlank(token)) {
            // 从请求参数中获取token（用于下载链接带token场景）
            token = request.getParameter(CommonConstant.ACCESS_TOKEN);
        }
        return token;
    }

    public static HttpServletRequest getRequest() {
        ServletRequestAttributes servletRequestAttributes = ((ServletRequestAttributes) RequestContextHolder.getRequestAttributes());
        return servletRequestAttributes == null ? null:servletRequestAttributes.getRequest();
    }
}
