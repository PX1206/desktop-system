package com.desktop.common.interceptor;

import com.desktop.common.exception.BusinessException;
import com.desktop.common.redis.RedisUtil;
import com.desktop.common.tool.LoginUtil;
import com.desktop.common.tool.StringUtil;
import com.desktop.common.tool.TokenUtil;
import lombok.extern.java.Log;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.stereotype.Component;
import org.springframework.web.servlet.HandlerInterceptor;
import org.springframework.web.servlet.ModelAndView;

import javax.servlet.http.HttpServletRequest;
import javax.servlet.http.HttpServletResponse;
import java.util.Arrays;
import java.util.List;
import java.util.concurrent.TimeUnit;

@Component
@Log
public class LoginInterceptor implements HandlerInterceptor {

	@Autowired
	private RedisUtil redisUtil;

	/**
	 * 允许在短窗口内重复访问的路径前缀（与 {@link #normalizeRequestPath} 之后的路径匹配）。<br>
	 * 全局规则：同一 token + 同一路径在 500ms 内仅放行 1 次，超出返回「请求过于频繁」。<br>
	 * 以下接口会被桌面/Web 端在短时间内连续调用，需放行：<br>
	 * — 同步：uploadForSync（多文件队列）、listBySyncDir（多目录连续拉取，且 URI 不含 query，路径相同）<br>
	 * — 云端列表：directoryTree、getPageList（刷新/翻页/搜索可能重叠）<br>
	 * — 通用上传、同步目录 CRUD<br>
	 * — userInfo（布局与多组件同时拉取）<br>
	 * 注意：经网关/Nginx 转发时若带 {@code /api} 前缀，必须先规范化再匹配，否则上传等会被误杀。
	 */
	private static final List<String> FREQUENT_ACCESS_PATHS = Arrays.asList(
			"/file/uploadForSync",
			"/file/listBySyncDir",
			"/file/directoryTree",
			"/file/getPageList",
			"/file/upload",
			"/syncDirectory",
			"/user/userInfo"
	);

	/** 与网关、Vite 代理一致：对外 /api/file/... 转发到应用内 /file/... */
	private static String normalizeRequestPath(String requestUri) {
		if (requestUri == null || requestUri.isEmpty()) {
			return "";
		}
		if (requestUri.startsWith("/api/")) {
			return requestUri.substring("/api".length());
		}
		return requestUri;
	}

	@Override
	public boolean preHandle(HttpServletRequest httpServletRequest, HttpServletResponse httpServletResponse, Object o) throws Exception {
		// 获取当前访问接口（限频按规范化路径统计，避免 /api 前缀导致白名单失效）
		String url = normalizeRequestPath(httpServletRequest.getRequestURI());
		log.info(url);

		// 处理OPTIONS请求
		if (httpServletRequest.getMethod().equals("OPTIONS")) {
			return true;
		}
		// 校验登录信息是否正常
		String token = TokenUtil.getToken();
		log.info(token);

		if (StringUtil.isBlank(token) || !redisUtil.hasKey(token)) {
			throw new BusinessException(401, "请重新登录！");
		}

		// 500ms 内同一 token 请求同一路径超过 1 次则拦截（路径已规范化，含 /api 与不含共用同一计数）
		long reqNum = redisUtil.incr("req-num-" + token + url, 1);
		if (reqNum > 1 && FREQUENT_ACCESS_PATHS.stream().noneMatch(url::startsWith)) {
			throw new BusinessException(500, "请求过于频繁！");
		}
		redisUtil.expire("req-num-" + token + url, 500, TimeUnit.MILLISECONDS);

		// 刷新token时效
		LoginUtil.refreshToken();

		return true;
	}

	@Override
	public void postHandle(HttpServletRequest httpServletRequest, HttpServletResponse httpServletResponse, Object o, ModelAndView modelAndView) throws Exception {

	}

	@Override
	public void afterCompletion(HttpServletRequest httpServletRequest, HttpServletResponse httpServletResponse, Object o, Exception e) throws Exception {

	}

}
