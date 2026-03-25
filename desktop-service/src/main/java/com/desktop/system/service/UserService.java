package com.desktop.system.service;

import com.desktop.common.vo.LoginUserInfoVO;
import com.desktop.system.entity.User;
import com.desktop.system.param.*;
import com.desktop.common.base.BaseService;
import com.desktop.common.pagination.Paging;
import com.desktop.system.vo.UserListVO;
import com.desktop.system.vo.UserVO;

import java.util.List;

/**
 * 用户 服务类
 *
 * @author Sakura
 * @since 2024-12-04
 */
public interface UserService extends BaseService<User> {

    /**
     * 用户注册
     *
     * @param userRegisterParam
     * @return
     * @throws Exception
     */
    boolean register(UserRegisterParam userRegisterParam) throws Exception;

    /**
     * 用户登录（账号密码）
     *
     * @param passwordLoginParam
     * @return
     * @throws Exception
     */
    LoginUserInfoVO passwordLogin(PasswordLoginParam passwordLoginParam) throws Exception;

    /**
     * 用户登录（短信验证码）
     *
     * @param smsLoginParam
     * @return
     * @throws Exception
     */
    LoginUserInfoVO smsLogin(SMSLoginParam smsLoginParam) throws Exception;

    /**
     * 修改用户（管理端）
     *
     * @param userParam
     * @return
     * @throws Exception
     */
    boolean update(UserParam userParam) throws Exception;

    /**
     * 新增用户（管理端）
     *
     * @param addUserParam
     * @return
     * @throws Exception
     */
    boolean addUser(AddUserParam addUserParam) throws Exception;

    /**
     * 修改用户（管理端）
     *
     * @param updateUserParam
     * @return
     * @throws Exception
     */
    boolean updateUser(UpdateUserParam updateUserParam) throws Exception;

    /**
     * 删除
     *
     * @param id
     * @return
     * @throws Exception
     */
    boolean deleteUser(Long id) throws Exception;

    /**
     * 用户详情
     *
     * @param id
     * @return
     * @throws Exception
     */
    UserVO getUser(Long id) throws Exception;


    /**
     * 获取分页对象
     *
     * @param userPageParam
     * @return
     * @throws Exception
     */
    Paging<UserListVO> getUserPageList(UserPageParam userPageParam) throws Exception;

    /**
     * 禁用
     *
     * @param id
     * @return
     * @throws Exception
     */
    boolean disable(Long id) throws Exception;

    /**
     * 冻结
     *
     * @param id
     * @return
     * @throws Exception
     */
    boolean freeze(Long id) throws Exception;


    /**
     * 解冻
     *
     * @param id
     * @return
     * @throws Exception
     */
    boolean restore(Long id) throws Exception;

    /**
     * 修改密码
     *
     * @param updatePasswordParam
     * @return
     * @throws Exception
     */
    boolean updatePassword(UpdatePasswordParam updatePasswordParam) throws Exception;

    /**
     * 重置密码
     *
     * @param resetPasswordParam
     * @return
     * @throws Exception
     */
    boolean resetPassword(ResetPasswordParam resetPasswordParam) throws Exception;

}
