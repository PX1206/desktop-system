package com.desktop.system.param;

import io.swagger.annotations.ApiModel;
import io.swagger.annotations.ApiModelProperty;
import lombok.Data;
import lombok.EqualsAndHashCode;
import lombok.experimental.Accessors;
import com.desktop.common.pagination.BasePageOrderParam;

@Data
@Accessors(chain = true)
@EqualsAndHashCode(callSuper = true)
@ApiModel(value = "角色分页参数")
public class RolePageParam extends BasePageOrderParam {
    private static final long serialVersionUID = 1L;

    @ApiModelProperty("角色名称模糊搜索")
    private String keyword;
}
