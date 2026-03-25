package com.desktop.system.param;

import com.desktop.common.pagination.BasePageOrderParam;
import io.swagger.annotations.ApiModel;
import io.swagger.annotations.ApiModelProperty;
import lombok.Data;
import lombok.EqualsAndHashCode;
import lombok.experimental.Accessors;

@Data
@Accessors(chain = true)
@EqualsAndHashCode(callSuper = true)
@ApiModel("安装包分页参数")
public class InstallPackagePageParam extends BasePageOrderParam {

    @ApiModelProperty("文件名/版本/备注模糊搜索")
    private String keyword;
}
