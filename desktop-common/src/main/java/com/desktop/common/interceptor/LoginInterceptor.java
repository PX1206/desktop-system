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
	// 定义允许频繁访问的接口路径列表（同步上传等场景需短时间多次请求）
	private static final List<String> FREQUENT_ACCESS_PATHS = Arrays.asList(
			"/api/public/fast-access",
			"/api/v1/specific/endpoint",
			"/file/uploadForSync",
			"/file/listBySyncDir",
			// 布局与子页（如文件页）常在同一时刻各拉一次当前用户信息，避免第二请求被 500ms 同 URL 限频误杀
			"/user/userInfo"
	);

	@Override
	public boolean preHandle(HttpServletRequest httpServletRequest, HttpServletResponse httpServletResponse, Object o) throws Exception {
		// 获取当前访问接口
		String url = httpServletRequest.getRequestURI();
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

		// 一秒内同一个token请求同一个接口超过1次直接拦截，防止接口请求过快
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
