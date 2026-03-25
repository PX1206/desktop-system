package com.desktop.generator.config.query;

public class MySqlQuery extends com.baomidou.mybatisplus.generator.config.querys.MySqlQuery {

    @Override
    public String[] fieldCustom() {
        return new String[]{"null", "default"};
    }

}
